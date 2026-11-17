import 'package:flutter/material.dart';
import 'package:rental_car/features/add_vehicle/presentation/widgets/form_card.dart';

import '../../../../app/theme/app_colors.dart';
import '../widgets/add_vehicle_scaffold.dart';
import 'photos_details_screen.dart';

class PricingScreen extends StatelessWidget {
  const PricingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AddVehicleScaffold(
      title: 'Pricing & Availability',
      step: 3,
      primaryLabel: 'Continue to Photos',
      onPrimary: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PhotosDetailsScreen())),
      child: FormCard(
        title: 'Pricing & Availability',
        subtitle: 'Set the rental rate and availability status.',
        icon: Icons.sell_outlined,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const FieldLabel('Available For'),
            const _ChoiceRow(labels: ['Daily', 'Weekly', 'Monthly'], selected: 0),
            const SizedBox(height: 14),
            const FieldLabel('Daily Rate (\$)', required: true),
            const FormInput(hint: '\$ 45.00 / day'),
            const SizedBox(height: 12),
            const FieldLabel('Weekly Rate (\$)', required: true),
            const FormInput(hint: '\$ 280.00 / week'),
            const SizedBox(height: 12),
            const FieldLabel('Monthly Rate (\$)', required: true),
            const FormInput(hint: '\$ 1,100.00 / month'),
            const SizedBox(height: 14),
            const FieldLabel('Status'),
            Row(
              children: [
                _status('Available', const Color(0xff198754), true),
                _status('Rented', const Color(0xff2563eb), false),
                _status('Maintenance', const Color(0xffc0840b), false),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _status(String label, Color color, bool selected) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.only(right: 5),
        padding: const EdgeInsets.symmetric(vertical: 11, horizontal: 4),
        decoration: BoxDecoration(
          color: selected ? color.withValues(alpha: .1) : AppColors.background,
          border: Border.all(color: selected ? color : const Color(0xffe1e1e5)),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(label, textAlign: TextAlign.center, style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600)),
      ),
    );
  }
}

class _ChoiceRow extends StatelessWidget {
  const _ChoiceRow({required this.labels, required this.selected});

  final List<String> labels;
  final int selected;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: labels.asMap().entries.map((entry) {
        final isSelected = entry.key == selected;
        return Expanded(
          child: Container(
            margin: const EdgeInsets.only(right: 4),
            padding: const EdgeInsets.symmetric(vertical: 9),
            decoration: BoxDecoration(color: isSelected ? AppColors.primary : AppColors.background, borderRadius: BorderRadius.circular(8), border: Border.all(color: isSelected ? AppColors.primary : const Color(0xffe1e1e5))),
            child: Text(entry.value, textAlign: TextAlign.center, style: TextStyle(fontSize: 11, color: isSelected ? Colors.white : AppColors.textSecondary)),
          ),
        );
      }).toList(),
    );
  }
}
