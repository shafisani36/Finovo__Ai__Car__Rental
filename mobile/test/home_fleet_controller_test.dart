import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:rental_car/features/add_vehicle/data/add_vehicle_repository.dart';
import 'package:rental_car/features/home/data/home_fleet_repository.dart';
import 'package:rental_car/features/home/models/vehicle_list_item.dart';
import 'package:rental_car/features/home/models/vehicle_stats.dart';
import 'package:rental_car/features/home/presentation/home_fleet_controller.dart';
import 'package:rental_car/features/home/presentation/widgets/cars_list_section.dart';

void main() {
  test('filters reset pagination and reset clears every filter', () async {
    final repository = _FakeRepository();
    final controller = HomeFleetController(repository: repository);
    addTearDown(controller.dispose);

    await controller.load();
    await controller.setPage(3);
    expect(controller.page, 3);

    await controller.setCategory('sedan');
    expect(controller.page, 1);
    expect(repository.lastCategoryId, 'sedan');

    await controller.setStatus('RENTED');
    expect(controller.page, 1);
    expect(repository.lastStatus, 'RENTED');

    await controller.setSearch('Corolla');
    expect(controller.page, 1);
    expect(repository.lastSearch, 'Corolla');

    await controller.setPage(2);
    await controller.resetFilters();
    expect(controller.page, 1);
    expect(controller.search, isEmpty);
    expect(controller.categoryId, isNull);
    expect(controller.status, isNull);
    expect(repository.lastSearch, isEmpty);
    expect(repository.lastCategoryId, isNull);
    expect(repository.lastStatus, isNull);
  });

  test('pagination window stays bounded for a large page count', () {
    expect(paginationWindow(1, 25), [1, 2, 3, 4, 5]);
    expect(paginationWindow(12, 25), [10, 11, 12, 13, 14]);
    expect(paginationWindow(25, 25), [21, 22, 23, 24, 25]);
  });

  testWidgets('cars section has no overflow at a 360 pixel width', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final controller = HomeFleetController(
      repository: _FakeRepository(
        vehicles: const [
          VehicleListItem(
            id: 'car-1',
            brand: 'Toyota',
            model: 'Corolla',
            year: 2024,
            registrationNumber: 'ABC-1234',
            categoryName: 'Sedan',
            dailyRate: 45,
            status: 'AVAILABLE',
            photos: [],
          ),
        ],
      ),
    );
    addTearDown(controller.dispose);
    await controller.load();

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: CarsListSection(controller: controller, onSignIn: () {}),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
  });
}

class _FakeRepository implements HomeFleetRepository {
  _FakeRepository({this.vehicles = const []});

  final List<VehicleListItem> vehicles;
  String? lastSearch;
  String? lastCategoryId;
  String? lastStatus;

  @override
  Future<List<VehicleCategory>> fetchCategories() async => const [];

  @override
  Future<VehicleStats> fetchVehicleStats() async =>
      const VehicleStats(total: 12, available: 7, rented: 3, maintenance: 2);

  @override
  Future<VehicleListPage> fetchVehicles({
    required int page,
    required int limit,
    String? search,
    String? categoryId,
    String? status,
  }) async {
    lastSearch = search;
    lastCategoryId = categoryId;
    lastStatus = status;
    return VehicleListPage(
      vehicles: vehicles,
      pagination: VehiclePagination(
        page: page,
        limit: limit,
        total: 25,
        totalPages: 5,
      ),
    );
  }
}
