import '../../../core/network/api_client.dart';
import '../../add_vehicle/data/add_vehicle_repository.dart';
import '../models/vehicle_list_item.dart';
import '../models/vehicle_stats.dart';

abstract interface class HomeFleetRepository {
  Future<VehicleListPage> fetchVehicles({
    required int page,
    required int limit,
    String? search,
    String? categoryId,
    String? status,
  });

  Future<VehicleStats> fetchVehicleStats();

  Future<List<VehicleCategory>> fetchCategories();
}

class ApiHomeFleetRepository implements HomeFleetRepository {
  ApiHomeFleetRepository({ApiClient? client})
    : _client = client ?? apiClient,
      _categoryRepository = AddVehicleRepository(client: client ?? apiClient);

  final ApiClient _client;
  final AddVehicleRepository _categoryRepository;

  @override
  Future<VehicleListPage> fetchVehicles({
    required int page,
    required int limit,
    String? search,
    String? categoryId,
    String? status,
  }) async {
    final queryParameters = <String, String>{
      'page': '$page',
      'limit': '$limit',
      if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
      if (categoryId != null && categoryId.isNotEmpty) 'category': categoryId,
      if (status != null && status != 'ALL') 'status': status,
    };
    final payload = await _client.get(
      '/vehicles',
      queryParameters: queryParameters,
    );
    return VehicleListPage.fromJson(payload, resolveImageUrl: _resolveImageUrl);
  }

  @override
  Future<VehicleStats> fetchVehicleStats() async {
    final payload = await _client.get('/vehicles/metrics');
    return VehicleStats.fromJson(payload);
  }

  @override
  Future<List<VehicleCategory>> fetchCategories() =>
      _categoryRepository.getCategories();

  String? _resolveImageUrl(String? value) {
    if (value == null || value.isEmpty) return null;
    final uri = Uri.tryParse(value);
    if (uri != null && uri.hasScheme) return uri.toString();
    return _client.serverOrigin.resolve(value).toString();
  }
}
