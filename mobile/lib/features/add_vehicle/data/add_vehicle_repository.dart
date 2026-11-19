import 'dart:convert';
import 'dart:typed_data';

import '../../../core/network/api_client.dart';

class VehicleCategory {
  const VehicleCategory({
    required this.id,
    required this.name,
    required this.slug,
  });

  final String id;
  final String name;
  final String slug;

  factory VehicleCategory.fromJson(Map<String, dynamic> json) {
    final id = json['id'];
    final name = json['name'];
    final slug = json['slug'];
    if (id is! String || name is! String || slug is! String) {
      throw const FormatException(
        'The server returned an invalid vehicle category.',
      );
    }
    return VehicleCategory(id: id, name: name, slug: slug);
  }
}

class PickedVehiclePhoto {
  const PickedVehiclePhoto({
    required this.bytes,
    required this.name,
    required this.mimeType,
  });

  final Uint8List bytes;
  final String name;
  final String mimeType;
}

class VehiclePhotoReference {
  const VehiclePhotoReference({
    required this.url,
    required this.caption,
    required this.isPrimary,
    required this.order,
  });

  final String url;
  final String caption;
  final bool isPrimary;
  final int order;

  factory VehiclePhotoReference.fromJson(Map<String, dynamic> json) {
    final url = json['url'];
    if (url is! String || url.isEmpty) {
      throw const FormatException(
        'The image service returned a photo without a URL.',
      );
    }
    return VehiclePhotoReference(
      url: url,
      caption: json['caption'] is String ? json['caption'] as String : '',
      isPrimary: json['isPrimary'] == true,
      order: json['order'] is int ? json['order'] as int : 0,
    );
  }

  Map<String, Object?> toJson() => {
    'url': url,
    'caption': caption,
    'isPrimary': isPrimary,
    'order': order,
  };
}

class AddVehicleRepository {
  AddVehicleRepository({ApiClient? client}) : _client = client ?? apiClient;

  final ApiClient _client;

  Future<List<VehicleCategory>> getCategories() async {
    final payload = await _client.get('/vehicles/categories');
    final values = payload['categories'];
    if (values is! List) {
      throw const ApiException('The server returned an invalid category list.');
    }
    return values
        .whereType<Map<String, dynamic>>()
        .map(VehicleCategory.fromJson)
        .toList(growable: false);
  }

  Future<List<VehiclePhotoReference>> uploadPhotos(
    List<PickedVehiclePhoto> photos,
  ) async {
    if (photos.length < 4 || photos.length > 6) {
      throw const ApiException('Choose between 4 and 6 vehicle photos.');
    }
    final payload = await _client.post('/vehicles/upload-images', {
      'photos': [
        for (var index = 0; index < photos.length; index++)
          {
            'data':
                'data:${photos[index].mimeType};base64,'
                '${base64Encode(photos[index].bytes)}',
            'caption': photos[index].name.length > 128
                ? photos[index].name.substring(0, 128)
                : photos[index].name,
            'isPrimary': index == 0,
            'order': index,
          },
      ],
    });
    final values = payload['photos'];
    if (values is! List) {
      throw const ApiException(
        'The image service returned an invalid response.',
      );
    }
    final uploaded = values
        .whereType<Map<String, dynamic>>()
        .map(VehiclePhotoReference.fromJson)
        .toList(growable: false);
    if (uploaded.length != photos.length) {
      throw const ApiException(
        'The image service did not process every photo.',
      );
    }
    return uploaded;
  }

  Future<Map<String, dynamic>> createVehicle({
    required String brand,
    required String model,
    required int year,
    required String registrationNumber,
    required String categoryId,
    required String transmission,
    required String fuelType,
    required int seats,
    required int doors,
    required int mileage,
    required String? color,
    required double dailyRate,
    required double? weeklyRate,
    required double? monthlyRate,
    required String pricingMethod,
    required String status,
    required bool isPublicCatalog,
    required String? notes,
    required List<VehiclePhotoReference> photos,
  }) async {
    final body = <String, Object?>{
      'brand': brand,
      'model': model,
      'year': year,
      'registrationNumber': registrationNumber,
      'categoryId': categoryId,
      'transmission': transmission,
      'fuelType': fuelType,
      'seats': seats,
      'doors': doors,
      'mileage': mileage,
      'pricingMethod': pricingMethod,
      'dailyRate': dailyRate,
      'status': status,
      'isPublicCatalog': isPublicCatalog,
      'photos': photos.map((photo) => photo.toJson()).toList(),
    };
    if (color != null && color.trim().isNotEmpty) body['color'] = color.trim();
    if (weeklyRate != null) body['weeklyRate'] = weeklyRate;
    if (monthlyRate != null) body['monthlyRate'] = monthlyRate;
    if (notes != null && notes.trim().isNotEmpty) body['notes'] = notes.trim();

    return _client.post('/vehicles', body);
  }
}
