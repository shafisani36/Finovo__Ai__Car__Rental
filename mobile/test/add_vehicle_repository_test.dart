import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:rental_car/core/network/api_client.dart';
import 'package:rental_car/features/add_vehicle/data/add_vehicle_repository.dart';

void main() {
  test(
    'uploads photos before creating a vehicle with backend field names',
    () async {
      final transport = _QueueClient([
        http.Response(
          jsonEncode({
            'success': true,
            'photos': [
              {
                'url': '/uploads/vehicles/front.jpg',
                'caption': 'front.jpg',
                'isPrimary': true,
                'order': 0,
              },
              {
                'url': '/uploads/vehicles/rear.jpg',
                'caption': 'rear.jpg',
                'isPrimary': false,
                'order': 1,
              },
              {
                'url': '/uploads/vehicles/side.jpg',
                'caption': 'side.jpg',
                'isPrimary': false,
                'order': 2,
              },
              {
                'url': '/uploads/vehicles/interior.jpg',
                'caption': 'interior.jpg',
                'isPrimary': false,
                'order': 3,
              },
            ],
          }),
          200,
        ),
        http.Response(
          jsonEncode({
            'success': true,
            'vehicle': {'id': 'vehicle-1'},
          }),
          201,
        ),
      ]);
      final client = ApiClient(
        client: transport,
        baseUri: Uri.parse('https://api.example.test/api/v1'),
      )..setAccessToken('staff-access-token');
      final repository = AddVehicleRepository(client: client);
      final pickedPhotos = [
        for (var index = 0; index < 4; index++)
          PickedVehiclePhoto(
            bytes: Uint8List.fromList([index]),
            name: 'photo-$index.jpg',
            mimeType: 'image/jpeg',
          ),
      ];

      final uploaded = await repository.uploadPhotos(pickedPhotos);
      final response = await repository.createVehicle(
        brand: 'Toyota',
        model: 'Corolla',
        year: 2025,
        registrationNumber: 'ABC-1234',
        categoryId: 'category-sedan',
        transmission: 'AUTOMATIC',
        fuelType: 'PETROL',
        seats: 5,
        doors: 4,
        mileage: 15000,
        color: 'White',
        dailyRate: 45,
        weeklyRate: 280,
        monthlyRate: 1100,
        pricingMethod: 'daily',
        status: 'AVAILABLE',
        isPublicCatalog: true,
        notes: null,
        photos: uploaded,
      );

      expect(response['success'], isTrue);
      expect(transport.requests, hasLength(2));
      expect(transport.requests[0].url.path, '/api/v1/vehicles/upload-images');
      expect(transport.requests[1].url.path, '/api/v1/vehicles');
      expect(
        transport.requests.every(
          (request) => request.headers.entries.any(
            (header) =>
                header.key.toLowerCase() == 'authorization' &&
                header.value == 'Bearer staff-access-token',
          ),
        ),
        isTrue,
      );

      final uploadBody = jsonDecode(transport.requests[0].body) as Map;
      expect((uploadBody['photos'] as List), hasLength(4));
      expect(
        (uploadBody['photos'] as List).first['data'],
        'data:image/jpeg;base64,AA==',
      );

      final vehicleBody = jsonDecode(transport.requests[1].body) as Map;
      expect(vehicleBody['categoryId'], 'category-sedan');
      expect(vehicleBody['dailyRate'], 45);
      expect(vehicleBody['weeklyRate'], 280);
      expect(vehicleBody['monthlyRate'], 1100);
      expect(vehicleBody['photos'], hasLength(4));
      expect(vehicleBody.containsKey('registration'), isFalse);
      expect(vehicleBody.containsKey('category'), isFalse);
    },
  );

  test('reports backend authentication and server errors', () async {
    final transport = _QueueClient([
      http.Response(
        jsonEncode({
          'success': false,
          'error': {'message': 'Invalid email or password'},
        }),
        401,
      ),
      http.Response(
        jsonEncode({
          'success': false,
          'error': {'message': 'Database temporarily unavailable'},
        }),
        503,
      ),
    ]);
    final client = ApiClient(
      client: transport,
      baseUri: Uri.parse('https://api.example.test/api/v1'),
    );

    await expectLater(
      client.post('/auth/login', {
        'email': 'staff@example.test',
        'password': 'bad',
      }),
      throwsA(
        isA<ApiException>()
            .having((error) => error.statusCode, 'statusCode', 401)
            .having(
              (error) => error.message,
              'message',
              'Invalid email or password',
            ),
      ),
    );
    await expectLater(
      client.get('/vehicles/categories'),
      throwsA(
        isA<ApiException>()
            .having((error) => error.statusCode, 'statusCode', 503)
            .having(
              (error) => error.message,
              'message',
              'Database temporarily unavailable',
            ),
      ),
    );
  });

  test(
    'refreshes an expired access token using the in-memory session cookies',
    () async {
      final transport = _QueueClient([
        http.Response(
          jsonEncode({'success': true, 'accessToken': 'old-token'}),
          200,
          headers: {
            'set-cookie':
                'finovo_session=session-1; HttpOnly; Expires=Wed, 18 Nov 2026 10:00:00 GMT, '
                'finovo_refresh=refresh-1; HttpOnly',
          },
        ),
        http.Response(
          jsonEncode({
            'success': false,
            'error': {'message': 'Access token expired'},
          }),
          401,
        ),
        http.Response(
          jsonEncode({'success': true, 'accessToken': 'new-token'}),
          200,
          headers: {
            'set-cookie': 'finovo_refresh=refresh-2; HttpOnly; Expires=Wed, 25 Nov 2026 10:00:00 GMT',
          },
        ),
        http.Response(jsonEncode({'success': true, 'photos': []}), 200),
      ]);
      final client = ApiClient(
        client: transport,
        baseUri: Uri.parse('https://api.example.test/api/v1'),
      );

      await client.post('/auth/login', const {});
      client.setAccessToken('old-token');
      await client.post('/vehicles/upload-images', const {});

      expect(transport.requests, hasLength(4));
      expect(
        transport.requests[1].headers['Authorization'],
        'Bearer old-token',
      );
      expect(transport.requests[2].url.path, '/api/v1/auth/refresh');
      expect(
        transport.requests[2].headers['Cookie'],
        contains('finovo_session=session-1'),
      );
      expect(
        transport.requests[2].headers['Cookie'],
        contains('finovo_refresh=refresh-1'),
      );
      expect(
        transport.requests[3].headers['Authorization'],
        'Bearer new-token',
      );
      expect(
        transport.requests[3].headers['Cookie'],
        contains('finovo_refresh=refresh-2'),
      );
    },
  );

  test(
    'rejects invalid photo counts before sending an upload request',
    () async {
      final transport = _QueueClient([]);
      final repository = AddVehicleRepository(
        client: ApiClient(
          client: transport,
          baseUri: Uri.parse('https://api.example.test/api/v1'),
        ),
      );

      await expectLater(
        repository.uploadPhotos(const []),
        throwsA(isA<ApiException>()),
      );
      expect(transport.requests, isEmpty);
    },
  );
}

class _RecordedRequest {
  const _RecordedRequest({
    required this.url,
    required this.headers,
    required this.body,
  });

  final Uri url;
  final Map<String, String> headers;
  final String body;
}

class _QueueClient extends http.BaseClient {
  _QueueClient(this._responses);

  final List<http.Response> _responses;
  final requests = <_RecordedRequest>[];

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    final body = await request.finalize().bytesToString();
    requests.add(
      _RecordedRequest(
        url: request.url,
        headers: Map<String, String>.from(request.headers),
        body: body,
      ),
    );
    final response = _responses.removeAt(0);
    return http.StreamedResponse(
      Stream.value(utf8.encode(response.body)),
      response.statusCode,
      headers: response.headers,
    );
  }
}
