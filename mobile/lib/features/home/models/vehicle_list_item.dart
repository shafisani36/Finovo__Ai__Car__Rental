class VehicleListItem {
  const VehicleListItem({
    required this.id,
    required this.brand,
    required this.model,
    required this.year,
    required this.registrationNumber,
    required this.categoryName,
    required this.dailyRate,
    required this.status,
    required this.photos,
    this.primaryImageUrl,
  });

  final String id;
  final String brand;
  final String model;
  final int year;
  final String registrationNumber;
  final String categoryName;
  final double dailyRate;
  final String status;
  final List<VehiclePhotoItem> photos;
  final String? primaryImageUrl;

  String? get imageUrl {
    for (final photo in photos) {
      if (photo.isPrimary && photo.url.isNotEmpty) return photo.url;
    }
    for (final photo in photos) {
      if (photo.url.isNotEmpty) return photo.url;
    }
    return primaryImageUrl;
  }

  factory VehicleListItem.fromJson(
    Map<String, dynamic> json, {
    String? Function(String?)? resolveImageUrl,
  }) {
    final category = json['category'];
    final categoryMap = category is Map<String, dynamic> ? category : null;
    final rawPhotos = json['photos'];
    final photos = rawPhotos is List
        ? rawPhotos
              .whereType<Map<String, dynamic>>()
              .map(
                (photo) => VehiclePhotoItem.fromJson(
                  photo,
                  resolveImageUrl: resolveImageUrl,
                ),
              )
              .where((photo) => photo.url.isNotEmpty)
              .toList(growable: false)
        : const <VehiclePhotoItem>[];

    return VehicleListItem(
      id: _stringValue(json['id']),
      brand: _stringValue(json['brand']),
      model: _stringValue(json['model']),
      year: _intValue(json['year']),
      registrationNumber: _stringValue(json['registrationNumber']),
      categoryName: _stringValue(categoryMap?['name'], fallback: '-'),
      dailyRate: _doubleValue(json['dailyRate']),
      status: _stringValue(json['status'], fallback: 'UNKNOWN'),
      photos: photos,
      primaryImageUrl: _resolvedUrl(json['primaryImageUrl'], resolveImageUrl),
    );
  }
}

class VehiclePhotoItem {
  const VehiclePhotoItem({required this.url, required this.isPrimary});

  final String url;
  final bool isPrimary;

  factory VehiclePhotoItem.fromJson(
    Map<String, dynamic> json, {
    String? Function(String?)? resolveImageUrl,
  }) {
    final rawUrl = json['url'] is String ? json['url'] as String : null;
    return VehiclePhotoItem(
      url: _resolvedUrl(rawUrl, resolveImageUrl) ?? '',
      isPrimary: json['isPrimary'] == true,
    );
  }
}

String? _resolvedUrl(
  Object? value,
  String? Function(String?)? resolveImageUrl,
) {
  if (value is! String || value.isEmpty) return null;
  return resolveImageUrl?.call(value) ?? value;
}

String _stringValue(Object? value, {String fallback = ''}) =>
    value is String ? value : fallback;

int _intValue(Object? value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse('$value') ?? 0;
}

double _doubleValue(Object? value) {
  if (value is num) return value.toDouble();
  return double.tryParse('$value') ?? 0;
}

class VehiclePagination {
  const VehiclePagination({
    required this.page,
    required this.limit,
    required this.total,
    required this.totalPages,
  });

  final int page;
  final int limit;
  final int total;
  final int totalPages;

  factory VehiclePagination.fromJson(Map<String, dynamic>? json) {
    return VehiclePagination(
      page: _intValue(json?['page']).clamp(1, 1 << 30).toInt(),
      limit: _intValue(json?['limit']).clamp(1, 1 << 30).toInt(),
      total: _intValue(json?['total']).clamp(0, 1 << 30).toInt(),
      totalPages: _intValue(json?['totalPages']).clamp(0, 1 << 30).toInt(),
    );
  }
}

class VehicleListPage {
  const VehicleListPage({required this.vehicles, required this.pagination});

  final List<VehicleListItem> vehicles;
  final VehiclePagination pagination;

  factory VehicleListPage.fromJson(
    Map<String, dynamic> json, {
    String? Function(String?)? resolveImageUrl,
  }) {
    final rawVehicles = json['vehicles'];
    final rawPagination = json['pagination'];
    if (rawVehicles is! List) {
      throw const FormatException(
        'The server returned an invalid vehicle list.',
      );
    }
    if (rawPagination is! Map<String, dynamic>) {
      throw const FormatException(
        'The server returned invalid vehicle pagination.',
      );
    }
    final vehicles = <VehicleListItem>[];
    for (final rawVehicle in rawVehicles) {
      if (rawVehicle is! Map<String, dynamic>) {
        throw const FormatException(
          'The server returned an invalid vehicle record.',
        );
      }
      vehicles.add(
        VehicleListItem.fromJson(rawVehicle, resolveImageUrl: resolveImageUrl),
      );
    }
    return VehicleListPage(
      vehicles: List.unmodifiable(vehicles),
      pagination: VehiclePagination.fromJson(rawPagination),
    );
  }
}
