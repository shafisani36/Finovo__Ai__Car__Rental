import 'package:flutter/foundation.dart';

import '../../../core/network/api_client.dart';
import '../../add_vehicle/data/add_vehicle_repository.dart';
import '../data/home_fleet_repository.dart';
import '../models/vehicle_list_item.dart';
import '../models/vehicle_stats.dart';

class HomeFleetController extends ChangeNotifier {
  HomeFleetController({required this.repository});

  static const int pageSize = 5;

  final HomeFleetRepository repository;
  int _requestId = 0;
  bool loading = false;
  Object? error;
  VehicleStats? stats;
  List<VehicleListItem> vehicles = const [];
  List<VehicleCategory> categories = const [];
  int page = 1;
  int total = 0;
  int totalPages = 0;
  String search = '';
  String? categoryId;
  String? status;

  bool get requiresSignIn =>
      error is Exception && _hasUnauthorizedStatus(error);

  bool get hasActiveFilters =>
      search.isNotEmpty || categoryId != null || status != null;

  Future<void> load() async {
    final requestId = ++_requestId;
    loading = true;
    error = null;
    notifyListeners();
    try {
      final statsRequest = repository.fetchVehicleStats();
      final categoriesRequest = repository.fetchCategories();
      var vehiclesRequest = _fetchCurrentPage();
      final results = await Future.wait<Object>([
        statsRequest,
        categoriesRequest,
        vehiclesRequest,
      ]);
      if (requestId != _requestId) return;

      final pageResult = results[2] as VehicleListPage;
      final lastPage = pageResult.pagination.totalPages < 1
          ? 1
          : pageResult.pagination.totalPages;
      if (page > lastPage) {
        page = lastPage;
        vehiclesRequest = _fetchCurrentPage();
        final correctedPage = await vehiclesRequest;
        if (requestId != _requestId) return;
        _applyPage(correctedPage);
      } else {
        _applyPage(pageResult);
      }
      stats = results[0] as VehicleStats;
      categories = results[1] as List<VehicleCategory>;
    } on Exception catch (loadError) {
      if (requestId == _requestId) error = loadError;
    } finally {
      if (requestId == _requestId) {
        loading = false;
        notifyListeners();
      }
    }
  }

  Future<void> setSearch(String value) async {
    final nextSearch = value.trim();
    if (search == nextSearch) return;
    search = nextSearch;
    page = 1;
    await load();
  }

  Future<void> setCategory(String? value) async {
    if (categoryId == value) return;
    categoryId = value;
    page = 1;
    await load();
  }

  Future<void> setStatus(String? value) async {
    if (status == value) return;
    status = value;
    page = 1;
    await load();
  }

  Future<void> setPage(int value) async {
    final target = value.clamp(1, totalPages < 1 ? 1 : totalPages).toInt();
    if (page == target || loading) return;
    page = target;
    await load();
  }

  Future<void> resetFilters() async {
    search = '';
    categoryId = null;
    status = null;
    page = 1;
    await load();
  }

  Future<VehicleListPage> _fetchCurrentPage() => repository.fetchVehicles(
    page: page,
    limit: pageSize,
    search: search,
    categoryId: categoryId,
    status: status,
  );

  void _applyPage(VehicleListPage result) {
    vehicles = result.vehicles;
    total = result.pagination.total;
    totalPages = result.pagination.totalPages;
  }

  bool _hasUnauthorizedStatus(Object? value) =>
      value is ApiException && value.statusCode == 401;
}

List<int> paginationWindow(int currentPage, int totalPages, {int size = 5}) {
  if (totalPages <= 0 || size <= 0) return const [];
  final count = totalPages < size ? totalPages : size;
  final start = (currentPage - count ~/ 2)
      .clamp(1, totalPages - count + 1)
      .toInt();
  return List<int>.generate(count, (index) => start + index);
}
