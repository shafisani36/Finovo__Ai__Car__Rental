import 'package:flutter/material.dart';
import 'package:rental_car/app/theme/app_colors.dart';
import 'package:rental_car/app/theme/app_text_theme.dart';
import 'package:rental_car/core/network/api_client.dart';
import 'package:rental_car/features/add_vehicle/data/add_vehicle_repository.dart';
import 'package:rental_car/features/add_vehicle/models/add_vehicle_draft.dart';
import 'package:rental_car/features/add_vehicle/presentation/widgets/form_card.dart';

import '../widgets/add_vehicle_scaffold.dart';

class ReviewPublishScreen extends StatefulWidget {
  const ReviewPublishScreen({super.key, required this.draft});

  final AddVehicleDraft draft;

  @override
  State<ReviewPublishScreen> createState() => _ReviewPublishScreenState();
}

class _ReviewPublishScreenState extends State<ReviewPublishScreen> {
  final _repository = AddVehicleRepository();
  bool _isSubmitting = false;

  Future<void> _publish() async {
    if (_isSubmitting) return;
    if (!apiClient.hasSession) {
      _showMessage('Your staff session has ended. Sign in again to publish.');
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final draft = widget.draft;
      final category = draft.category;
      if (category == null) {
        throw const ApiException(
          'Select a vehicle category before publishing.',
        );
      }
      final brand = draft.brand;
      if (brand == null || brand.isEmpty) {
        throw const ApiException('Select a vehicle brand before publishing.');
      }
      final uploadedPhotos = draft.uploadedPhotos ??= await _repository
          .uploadPhotos(draft.photos);

      final response = await _repository.createVehicle(
        brand: brand,
        model: draft.model,
        year: draft.year,
        registrationNumber: draft.registrationNumber,
        categoryId: category.id,
        transmission: draft.transmission,
        fuelType: draft.fuelType,
        seats: draft.seats,
        doors: draft.doors,
        mileage: int.parse(draft.mileage),
        color: draft.color,
        dailyRate: double.parse(draft.dailyRate),
        weeklyRate: double.parse(draft.weeklyRate),
        monthlyRate: double.parse(draft.monthlyRate),
        pricingMethod: draft.availableFor == 'Monthly' ? 'monthly' : 'daily',
        status: draft.status,
        isPublicCatalog: draft.isPublicCatalog,
        notes: draft.notes,
        photos: uploadedPhotos,
      );
      if (response['success'] != true || response['vehicle'] is! Map) {
        throw const ApiException(
          'The server did not confirm vehicle creation.',
        );
      }

      if (!mounted) return;
      final messenger = ScaffoldMessenger.of(context);
      final navigator = Navigator.of(context);
      navigator.popUntil(
        (route) => route.settings.name == addVehicleFlowRouteName,
      );
      navigator.pop(true);
      messenger.showSnackBar(
        const SnackBar(
          content: Text('Vehicle published successfully.'),
          backgroundColor: Color(0xff198754),
        ),
      );
    } on ApiException catch (error) {
      if (mounted) _showMessage(error.message);
    } on FormatException catch (error) {
      if (mounted) _showMessage(error.message);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red.shade700),
    );
  }

  String _rate(String value) => value.isEmpty ? '—' : value;

  @override
  Widget build(BuildContext context) {
    final draft = widget.draft;
    final photoBytes = draft.primaryPhotoBytes;
    return PopScope(
      canPop: !_isSubmitting,
      child: AddVehicleScaffold(
        title: 'Review & Publish',
        step: 5,
        primaryLabel: _isSubmitting ? 'Publishing...' : 'Save & Publish Car',
        onPrimary: _publish,
        isSubmitting: _isSubmitting,
        secondaryLabel: 'Cancel',
        onSecondary: () =>
            Navigator.popUntil(context, (route) => route.isFirst),
        child: Column(
          children: [
            FormCard(
              title: "Live Catalog Preview",
              subtitle: "Please preview before publishing",
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  color: Color(0xffEDEDEF),
                ),
                child: Padding(
                  padding: const .all(8.0),
                  child: Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: photoBytes == null
                            ? Container(
                                width: 74,
                                height: 70,
                                color: AppColors.primary10,
                                child: const Icon(
                                  Icons.directions_car,
                                  size: 38,
                                  color: AppColors.gray,
                                ),
                              )
                            : Image.memory(
                                photoBytes,
                                width: 74,
                                height: 70,
                                fit: BoxFit.cover,
                              ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${draft.brand ?? ''} ${draft.model} (${draft.year})',
                              style: AppTextStyles.heading6,
                            ),
                            Text(
                              draft.category?.name ?? '',
                              style: AppTextStyles.subtitle3,
                            ),
                            const SizedBox(height: 5),
                            Text(
                              '${_rate(draft.dailyRate)} / day',
                              style: AppTextStyles.subtitle3.copyWith(
                                color: AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 14),
            FormCard(
              title: 'Vehicle Summary',
              subtitle: 'Please verify all specifications',
              icon: Icons.checklist_outlined,
              child: Column(
                children: [
                  _summaryRow(
                    'Vehicle',
                    '${draft.brand ?? ''} ${draft.model} (${draft.year})',
                  ),
                  _summaryRow(
                    'Specs',
                    '${_transmissionLabel(draft.transmission)} · '
                        '${_fuelLabel(draft.fuelType)} · ${draft.seats} seats',
                  ),
                  _summaryRow(
                    'Pricing',
                    '${_rate(draft.dailyRate)}/day · '
                        '${_rate(draft.weeklyRate)}/week · '
                        '${_rate(draft.monthlyRate)}/month',
                  ),
                  _summaryRow('Registration', draft.registrationNumber),
                  _summaryRow('Category', draft.category?.name ?? '—'),
                  _summaryRow('Mileage', draft.mileage),
                  _summaryRow('Photos', '${draft.photos.length}'),
                  _summaryRow('Status', _statusLabel(draft.status)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _transmissionLabel(String value) =>
      value == 'AUTOMATIC' ? 'Automatic' : 'Manual';

  String _fuelLabel(String value) => switch (value) {
    'DIESEL' => 'Diesel',
    'HYBRID' => 'Hybrid',
    'ELECTRIC' => 'Electric',
    _ => 'Petrol',
  };

  String _statusLabel(String value) => switch (value) {
    'RENTED' => 'Rented',
    'MAINTENANCE' => 'Maintenance',
    _ => 'Available',
  };

  Widget _summaryRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          Text(
            label,
            style: AppTextStyles.subtitle3.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: AppTextStyles.subtitle3,
            ),
          ),
        ],
      ),
    );
  }
}
