import '../../../core/network/api_client.dart';

class AuthRepository {
  AuthRepository({ApiClient? client}) : _client = client ?? apiClient;

  static const _vehicleStaffRoles = {'ADMIN', 'SUPER_ADMIN', 'FLEET_MANAGER'};

  final ApiClient _client;

  Future<void> signIn({required String email, required String password}) async {
    final payload = await _client.post('/auth/login', {
      'email': email.trim(),
      'password': password,
      'rememberMe': false,
    });
    final token = payload['accessToken'];
    final user = payload['user'];
    if (token is! String || token.isEmpty || user is! Map<String, dynamic>) {
      throw const ApiException(
        'The server returned an invalid sign-in response.',
      );
    }

    _client.setAccessToken(token);
    final rawRoles = user['roles'];
    final roles = rawRoles is List
        ? rawRoles.whereType<String>().toSet()
        : <String>{};
    if (roles.intersection(_vehicleStaffRoles).isEmpty) {
      await _client.logout();
      throw const ApiException(
        'Your account does not have permission to manage fleet vehicles.',
        statusCode: 403,
      );
    }
  }
}
