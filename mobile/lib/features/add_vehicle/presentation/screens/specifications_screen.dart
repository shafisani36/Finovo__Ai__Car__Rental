import 'package:flutter/material.dart';
import 'package:rental_car/features/add_vehicle/models/add_vehicle_draft.dart';
import 'package:rental_car/features/add_vehicle/presentation/widgets/form_card.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_text_theme.dart';
import '../widgets/add_vehicle_scaffold.dart';
import 'pricing_screen.dart';

class SpecificationsScreen extends StatefulWidget {
  const SpecificationsScreen({super.key, required this.draft});

  final AddVehicleDraft draft;

  @override
  State<SpecificationsScreen> createState() => _SpecificationsScreenState();
}

class _SpecificationsScreenState extends State<SpecificationsScreen> {
  final _formKey = GlobalKey<FormState>();
  late final _colorController = TextEditingController(text: widget.draft.color);
  late final _mileageController = TextEditingController(
    text: widget.draft.mileage,
  );
  late String _transmission = widget.draft.transmission;
  late String _fuelType = widget.draft.fuelType;
  late int _seats = widget.draft.seats;
  late int _doors = widget.draft.doors;

  @override
  void dispose() {
    _colorController.dispose();
    _mileageController.dispose();
    super.dispose();
  }

  void _onContinue() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    widget.draft
      ..transmission = _transmission
      ..fuelType = _fuelType
      ..seats = _seats
      ..doors = _doors
      ..color = _colorController.text.trim()
      ..mileage = _mileageController.text.trim();
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => PricingScreen(draft: widget.draft)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AddVehicleScaffold(
      title: 'Specifications',
      step: 2,
      primaryLabel: 'Continue to Pricing',
      onPrimary: _onContinue,
      child: Form(
        key: _formKey,
        child: FormCard(
          title: 'Specifications',
          subtitle: 'Technical details and features',
          icon: Icons.settings_outlined,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const FieldLabel('Transmission', required: true),
              _ChoiceRow(
                labels: const ['Automatic', 'Manual'],
                selected: _transmission == 'AUTOMATIC' ? 0 : 1,
                onSelect: (index) => setState(
                  () => _transmission = index == 0 ? 'AUTOMATIC' : 'MANUAL',
                ),
              ),
              const SizedBox(height: 14),
              const FieldLabel('Fuel Type', required: true),
              _ChoiceRow(
                labels: const ['Petrol', 'Diesel', 'Hybrid', 'Electric'],
                selected: [
                  'PETROL',
                  'DIESEL',
                  'HYBRID',
                  'ELECTRIC',
                ].indexOf(_fuelType),
                onSelect: (index) => setState(
                  () => _fuelType = [
                    'PETROL',
                    'DIESEL',
                    'HYBRID',
                    'ELECTRIC',
                  ][index],
                ),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: _Counter(
                      label: 'Seats',
                      value: _seats,
                      minimum: 1,
                      maximum: 20,
                      onChanged: (value) => setState(() => _seats = value),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _Counter(
                      label: 'Doors',
                      value: _doors,
                      minimum: 1,
                      maximum: 10,
                      onChanged: (value) => setState(() => _doors = value),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              const FieldLabel('Color'),
              FormInput(
                hint: 'Select color',
                controller: _colorController,
                suffix: const Icon(Icons.keyboard_arrow_down),
                validator: (value) {
                  if ((value?.trim().length ?? 0) > 32) {
                    return 'Color must be 32 characters or fewer';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 14),
              const FieldLabel('Mileage', required: true),
              FormInput(
                hint: 'e.g. 15000',
                controller: _mileageController,
                keyboardType: TextInputType.number,
                validator: (value) {
                  final mileage = int.tryParse(value?.trim() ?? '');
                  if (mileage == null || mileage < 0) {
                    return 'Enter a whole number greater than or equal to 0';
                  }
                  return null;
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ChoiceRow extends StatelessWidget {
  const _ChoiceRow({
    required this.labels,
    required this.selected,
    required this.onSelect,
  });

  final List<String> labels;
  final int selected;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: labels.asMap().entries.map((entry) {
        final isSelected = entry.key == selected;
        return Expanded(
          child: InkWell(
            onTap: () => onSelect(entry.key),
            borderRadius: BorderRadius.circular(8),
            child: Container(
              margin: const EdgeInsets.only(right: 4),
              padding: const EdgeInsets.symmetric(vertical: 9),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primary : AppColors.background,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: isSelected
                      ? AppColors.primary
                      : const Color(0xffe1e1e5),
                ),
              ),
              child: Text(
                entry.value,
                textAlign: TextAlign.center,
                style: AppTextStyles.subtitle3.copyWith(
                  color: isSelected ? Colors.white : AppColors.textSecondary,
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}

class _Counter extends StatelessWidget {
  const _Counter({
    required this.label,
    required this.value,
    required this.minimum,
    required this.maximum,
    required this.onChanged,
  });

  final String label;
  final int value;
  final int minimum;
  final int maximum;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        FieldLabel(label, required: true),
        Container(
          height: 40,
          decoration: BoxDecoration(
            color: AppColors.background,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: const Color(0xffe1e1e5)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              IconButton(
                onPressed: value > minimum ? () => onChanged(value - 1) : null,
                icon: const Icon(Icons.remove, size: 16),
                visualDensity: VisualDensity.compact,
              ),
              Text('$value'),
              IconButton(
                onPressed: value < maximum ? () => onChanged(value + 1) : null,
                icon: const Icon(Icons.add, size: 16),
                visualDensity: VisualDensity.compact,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
