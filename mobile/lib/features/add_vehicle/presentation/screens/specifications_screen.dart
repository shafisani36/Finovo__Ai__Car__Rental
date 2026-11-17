import 'package:flutter/material.dart';
import 'package:rental_car/features/add_vehicle/presentation/widgets/form_card.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_text_theme.dart';
import '../widgets/add_vehicle_scaffold.dart';
import 'pricing_screen.dart';

class SpecificationsScreen extends StatelessWidget {
  const SpecificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AddVehicleScaffold(
      title: 'Specifications',
      step: 2,
      primaryLabel: 'Continue to Pricing',
      onPrimary: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PricingScreen())),
      child: FormCard(
        title: 'Specifications',
        subtitle: 'Technical details and features',
        icon: Icons.settings_outlined,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const FieldLabel('Transmission', required: true),
            const _ChoiceRow(labels: ['Automatic', 'Manual'], selected: 0),
            const SizedBox(height: 14),
            const FieldLabel('Fuel Type', required: true),
            const _ChoiceRow(labels: ['Petrol', 'Diesel', 'Hybrid', 'Electric'], selected: 0),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(child: _Counter(label: 'Seats', value: '5')),
                const SizedBox(width: 10),
                Expanded(child: _Counter(label: 'Doors', value: '4')),
              ],
            ),
            const SizedBox(height: 14),
            const FieldLabel('Color'),
            const FormInput(hint: 'Select color', suffix: Icon(Icons.keyboard_arrow_down)),
            const SizedBox(height: 14),
            const FieldLabel('Mileage', required: true),
            const FormInput(hint: 'e.g. 15000'),
          ],
        ),
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
      children: labels.map((label) {
        final isSelected = labels.indexOf(label) == selected;
        return Expanded(
          child: Container(
            margin: const EdgeInsets.only(right: 4),
            padding: const EdgeInsets.symmetric(vertical: 9),
            decoration: BoxDecoration(
              color: isSelected ? AppColors.primary : AppColors.background,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: isSelected ? AppColors.primary : const Color(0xffe1e1e5)),
            ),
            child: Text(label, textAlign: TextAlign.center, style: AppTextStyles.subtitle3.copyWith(color: isSelected ? Colors.white : AppColors.textSecondary)),
          ),
        );
      }).toList(),
    );
  }
}

class _Counter extends StatelessWidget {
  const _Counter({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        FieldLabel(label, required: true),
        Container(
          height: 40,
          decoration: BoxDecoration(color: AppColors.background, borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xffe1e1e5))),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [const Text('-'), Text(value), const Text('+')],
          ),
        ),
      ],
    );
  }
}
