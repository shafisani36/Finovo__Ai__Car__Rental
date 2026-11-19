import 'dart:typed_data';

import '../data/add_vehicle_repository.dart';

class AddVehicleDraft {
  String? brand;
  String model = '';
  int year = DateTime.now().year;
  String registrationNumber = '';
  VehicleCategory? category;

  String transmission = 'AUTOMATIC';
  String fuelType = 'PETROL';
  int seats = 5;
  int doors = 4;
  String color = '';
  String mileage = '';

  String dailyRate = '';
  String weeklyRate = '';
  String monthlyRate = '';
  String availableFor = 'Daily';
  String status = 'AVAILABLE';

  final List<PickedVehiclePhoto> photos = [];
  List<VehiclePhotoReference>? uploadedPhotos;
  String notes = '';
  bool isPublicCatalog = true;

  Uint8List? get primaryPhotoBytes =>
      photos.isEmpty ? null : photos.first.bytes;
}
