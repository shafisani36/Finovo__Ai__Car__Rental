import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode, this.code});

  final String message;
  final int? statusCode;
  final String? code;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({http.Client? client, Uri? baseUri})
    : _httpClient = client ?? http.Client(),
      _baseUri =
          baseUri ??
          Uri.parse(
            const String.fromEnvironment(
              'FINOVO_API_BASE_URL',
              defaultValue: 'http://localhost:5000/api/v1',
            ),
          ) {
    if (_baseUri.scheme != 'http' && _baseUri.scheme != 'https') {
      throw ArgumentError.value(_baseUri, 'baseUri', 'Must use HTTP or HTTPS.');
    }
    if (kReleaseMode && _baseUri.scheme != 'https') {
      throw StateError('FINOVO_API_BASE_URL must use HTTPS in release builds.');
    }
  }

  final http.Client _httpClient;
  final Uri _baseUri;
  final Map<String, String> _cookies = {};
  String? _accessToken;
  Future<void>? _refreshFuture;
  static const _storage = FlutterSecureStorage();
  static const _cookiesKey = 'finovo_session_cookies';

  Future<void> persistSession() async {
    try {
      await _storage.write(key: _cookiesKey, value: jsonEncode(_cookies));
    } catch (_) {
      // Storage is a convenience; a failed write must not break the request.
    }
  }

  Future<bool> restoreSession() async {
    final saved = await _storage.read(key: _cookiesKey);
    if (saved == null || saved.isEmpty) return false;
    try {
      final decoded = jsonDecode(saved);
      if (decoded is! Map) return false;
      _cookies
        ..clear()
        ..addAll(decoded.map((k, v) => MapEntry('$k', '$v')));
      await _refreshAccessToken();
      return hasSession;
    } on ApiException {
      return false;
    }
  }

  bool get hasSession => _accessToken != null;

  void setAccessToken(String token) {
    _accessToken = token;
  }

  Future<Map<String, dynamic>> get(String path) => _request('GET', path);

  Future<Map<String, dynamic>> post(String path, Map<String, Object?> body) =>
      _request('POST', path, body: body);

  Future<Map<String, dynamic>> _request(
    String method,
    String path, {
    Map<String, Object?>? body,
    bool refreshOnUnauthorized = true,
  }) async {
    var response = await _send(method, path, body);
    if (response.statusCode == 401 &&
        refreshOnUnauthorized &&
        _accessToken != null &&
        path != '/auth/login') {
      await _refreshAccessToken();
      response = await _send(method, path, body);
    }
    return _decodeResponse(response);
  }

  Future<http.Response> _send(
    String method,
    String path,
    Map<String, Object?>? body,
  ) async {
    final request = http.Request(method, _resolve(path))
      ..headers['Accept'] = 'application/json'
      ..headers['X-Correlation-Id'] =
          'mobile_${DateTime.now().microsecondsSinceEpoch}';

    final token = _accessToken;
    if (token != null) {
      request.headers['Authorization'] = 'Bearer $token';
    }
    if (_cookies.isNotEmpty) {
      request.headers['Cookie'] = _cookies.entries
          .map((entry) => '${entry.key}=${entry.value}')
          .join('; ');
    }
    if (body != null) {
      request.headers['Content-Type'] = 'application/json';
      request.body = jsonEncode(body);
    }

    try {
      final response = await http.Response.fromStream(
        await _httpClient.send(request),
      ).timeout(const Duration(seconds: 90));
      _rememberCookies(response.headers['set-cookie']);
      return response;
    } on TimeoutException {
      throw const ApiException(
        'The request timed out. Check your connection and try again.',
      );
    } on http.ClientException catch (error) {
      throw ApiException('Could not reach the Finovo server: ${error.message}');
    }
  }

  Uri _resolve(String path) {
    final prefix = _baseUri.path.endsWith('/')
        ? _baseUri.path.substring(0, _baseUri.path.length - 1)
        : _baseUri.path;
    final suffix = path.startsWith('/') ? path : '/$path';
    return _baseUri.replace(path: '$prefix$suffix');
  }

  Map<String, dynamic> _decodeResponse(http.Response response) {
    Object? decoded;
    try {
      decoded = jsonDecode(response.body);
    } on FormatException {
      throw ApiException(
        response.statusCode >= 200 && response.statusCode < 300
            ? 'The server returned an invalid response.'
            : 'The server returned an unexpected error (${response.statusCode}).',
        statusCode: response.statusCode,
      );
    }

    if (decoded is! Map<String, dynamic>) {
      throw ApiException(
        'The server returned an unexpected response.',
        statusCode: response.statusCode,
      );
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final error = decoded['error'];
      final errorMap = error is Map<String, dynamic> ? error : null;
      final message = errorMap?['message'] ?? decoded['message'];
      throw ApiException(
        message is String
            ? message
            : 'The server returned an error (${response.statusCode}).',
        statusCode: response.statusCode,
        code: errorMap?['code'] is String ? errorMap!['code'] as String : null,
      );
    }
    return decoded;
  }

  void _rememberCookies(String? header) {
    if (header == null || header.isEmpty) return;
    final matches = RegExp(r'(?:^|,\s*)([^=;,\s]+)=([^;,\s]+)')
        .allMatches(header);
    for (final match in matches) {
      final name = match.group(1);
      final value = match.group(2);
      if (name != null && value != null) _cookies[name] = value;
    }
  }

  Future<void> _refreshAccessToken() {
    final pendingRefresh = _refreshFuture;
    if (pendingRefresh != null) return pendingRefresh;

    final refresh = _performRefresh();
    _refreshFuture = refresh;
    return refresh.whenComplete(() {
      if (identical(_refreshFuture, refresh)) _refreshFuture = null;
    });
  }

  Future<void> _performRefresh() async {
    try {
      final response = await _send('POST', '/auth/refresh', const {});
      final payload = _decodeResponse(response);
      final token = payload['accessToken'];
      if (token is! String || token.isEmpty) {
        throw const ApiException(
          'The server did not return a refreshed token.',
        );
      }
      _accessToken = token;
      await persistSession();
    } on ApiException catch (error) {
      if (error.statusCode == 401 || error.statusCode == 403) {
        clearSession();
        throw const ApiException(
          'Your staff session has expired. Please sign in again.',
          statusCode: 401,
        );
      }
      rethrow;
    }
  }

  Future<void> logout() async {
    try {
      if (_accessToken != null) {
        await _request(
          'POST',
          '/auth/logout',
          body: const {},
          refreshOnUnauthorized: false,
        );
      }
    } finally {
      clearSession();
    }
  }

  void clearSession() {
    _accessToken = null;
    _cookies.clear();
    unawaited(_storage.delete(key: _cookiesKey));
  }
}

final apiClient = ApiClient();
