import 'package:flutter/material.dart';
import 'package:rental_car/features/add_vehicle/presentation/widgets/form_card.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_text_theme.dart';
import '../widgets/add_vehicle_scaffold.dart';

class ReviewPublishScreen extends StatelessWidget {
  const ReviewPublishScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AddVehicleScaffold(
      title: 'Review & Publish',
      step: 5,
      primaryLabel: 'Save & Publish Car',
      onPrimary: () => Navigator.popUntil(context, (route) => route.isFirst),
      secondaryLabel: 'Cancel',
      onSecondary: () => Navigator.popUntil(context, (route) => route.isFirst),
      child: Column(
        children: [
          _previewCard(),
          const SizedBox(height: 14),
          FormCard(
            title: 'Vehicle Summary',
            subtitle: 'Please verify all specifications',
            icon: Icons.checklist_outlined,
            child: Column(
              children: [
                _summaryRow('Vehicle', 'Toyota Corolla (2026)'),
                _summaryRow('Specs', 'Automatic · Petrol · 5 seats'),
                _summaryRow('Pricing', '\$45.00/day · \$280.00/wk'),
                _summaryRow('Registration', 'ABC-1234'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _previewCard() {
    return Card(
      margin: EdgeInsets.zero,
      elevation: 0,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(width: 74, height: 70, decoration: BoxDecoration(color: AppColors.primary10, borderRadius: BorderRadius.circular(8)), child: const Icon(Icons.directions_car, size: 38, color: AppColors.gray)),
            const SizedBox(width: 12),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Toyota Corolla', style: AppTextStyles.heading6),
                Text('2026', style: TextStyle(fontSize: 12)),
                SizedBox(height: 5),
                Text('\$45.00 / day', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _summaryRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          SizedBox(width: 85, child: Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary))),
          Expanded(child: Text(value, textAlign: TextAlign.right, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600))),
        ],
      ),
    );
  }
}
