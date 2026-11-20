import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:rental_car/core/network/api_client.dart';
import 'package:rental_car/features/home/data/home_fleet_repository.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('parses list fields and resolves relative photo URLs', () async {
    final transport = _MockClient([
      http.Response(
        jsonEncode({
          'success': true,
          'vehicles': [
            {
              'id': 'car-1',
              'brand': 'Toyota',
              'model': 'Corolla',
              'year': '2024',
              'registrationNumber': 'ABC-1234',
              'category': {'id': 'sedan', 'name': 'Sedan'},
              'dailyRate': '45.50',
              'status': 'AVAILABLE',
              'photos': [
                {'url': '/uploads/vehicles/front.jpg', 'isPrimary': true},
              ],
            },
          ],
          'pagination': {
            'page': '1',
            'limit': '5',
            'total': '1',
            'totalPages': '1',
          },
        }),
        200,
      ),
    ]);
    final repository = ApiHomeFleetRepository(
      client: ApiClient(
        client: transport,
        baseUri: Uri.parse('http://192.168.100.2:5000/api/v1'),
      ),
    );

    final result = await repository.fetchVehicles(
      page: 1,
      limit: 5,
      search: ' Corolla ',
      categoryId: 'sedan',
      status: 'AVAILABLE',
    );

    expect(result.vehicles, hasLength(1));
    expect(result.vehicles.single.year, 2024);
    expect(result.vehicles.single.dailyRate, 45.5);
    expect(
      result.vehicles.single.imageUrl,
      'http://192.168.100.2:5000/uploads/vehicles/front.jpg',
    );
    expect(result.pagination.total, 1);
    expect(transport.requests.single.url.queryParameters, {
      'page': '1',
      'limit': '5',
      'search': 'Corolla',
      'category': 'sedan',
      'status': 'AVAILABLE',
    });
  });

  test('accepts absent or null photos and an empty vehicle list', () async {
    final transport = _MockClient([
      http.Response(
        jsonEncode({
          'success': true,
          'vehicles': [
            {
              'id': 'car-without-photos',
              'brand': 'Honda',
              'model': 'Civic',
              'year': 2023,
              'registrationNumber': 'XYZ-0001',
              'category': null,
              'dailyRate': 50,
              'status': 'AVAILABLE',
              'photos': null,
            },
          ],
          'pagination': {'page': 1, 'limit': 5, 'total': 1, 'totalPages': 1},
        }),
        200,
      ),
      http.Response(
        jsonEncode({
          'success': true,
          'vehicles': [],
          'pagination': {'page': 1, 'limit': 5, 'total': 0, 'totalPages': 0},
        }),
        200,
      ),
    ]);
    final repository = ApiHomeFleetRepository(
      client: ApiClient(
        client: transport,
        baseUri: Uri.parse('https://api.example.test/api/v1'),
      ),
    );

    final withNoPhotos = await repository.fetchVehicles(page: 1, limit: 5);
    final empty = await repository.fetchVehicles(page: 1, limit: 5);

    expect(withNoPhotos.vehicles.single.photos, isEmpty);
    expect(withNoPhotos.vehicles.single.imageUrl, isNull);
    expect(empty.vehicles, isEmpty);
    expect(empty.pagination.totalPages, 0);
  });

  test(
    'propagates backend errors instead of returning an empty list',
    () async {
      final repository = ApiHomeFleetRepository(
        client: ApiClient(
          client: _MockClient([
            http.Response(
              jsonEncode({
                'success': false,
                'error': {'message': 'Fleet service unavailable'},
              }),
              503,
            ),
          ]),
          baseUri: Uri.parse('https://api.example.test/api/v1'),
        ),
      );

      await expectLater(
        repository.fetchVehicles(page: 1, limit: 5),
        throwsA(
          isA<ApiException>()
              .having((error) => error.statusCode, 'statusCode', 503)
              .having(
                (error) => error.message,
                'message',
                'Fleet service unavailable',
              ),
        ),
      );
    },
  );

  test('rejects a malformed successful vehicle-list response', () async {
    final repository = ApiHomeFleetRepository(
      client: ApiClient(
        client: _MockClient([
          http.Response(
            jsonEncode({
              'success': true,
              'pagination': {
                'page': 1,
                'limit': 5,
                'total': 0,
                'totalPages': 0,
              },
            }),
            200,
          ),
        ]),
        baseUri: Uri.parse('https://api.example.test/api/v1'),
      ),
    );

    await expectLater(
      repository.fetchVehicles(page: 1, limit: 5),
      throwsA(isA<FormatException>()),
    );
  });

  test('parses whole-fleet metric values sent as strings', () async {
    final repository = ApiHomeFleetRepository(
      client: ApiClient(
        client: _MockClient([
          http.Response(
            jsonEncode({
              'success': true,
              'metrics': {
                'total': '13',
                'available': '7',
                'rented': 4,
                'maintenance': '2',
              },
            }),
            200,
          ),
        ]),
        baseUri: Uri.parse('https://api.example.test/api/v1'),
      ),
    );

    final stats = await repository.fetchVehicleStats();

    expect(stats.total, 13);
    expect(stats.available, 7);
    expect(stats.rented, 4);
    expect(stats.maintenance, 2);
  });
}

class _MockClient extends http.BaseClient {
  _MockClient(this._responses);

  final List<http.Response> _responses;
  final requests = <http.Request>[];

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    final body = await request.finalize().bytesToString();
    final recorded = http.Request(request.method, request.url)
      ..headers.addAll(request.headers)
      ..body = body;
    requests.add(recorded);
    final response = _responses.removeAt(0);
    return http.StreamedResponse(
      Stream.value(utf8.encode(response.body)),
      response.statusCode,
      headers: response.headers,
    );
  }
}
