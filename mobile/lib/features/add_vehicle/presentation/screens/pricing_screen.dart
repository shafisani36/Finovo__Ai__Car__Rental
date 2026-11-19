import 'package:flutter/material.dart';
import 'package:rental_car/features/add_vehicle/models/add_vehicle_draft.dart';
import 'package:rental_car/features/add_vehicle/presentation/widgets/form_card.dart';

import '../../../../app/theme/app_colors.dart';
import '../widgets/add_vehicle_scaffold.dart';
import 'photos_details_screen.dart';

class PricingScreen extends StatefulWidget {
  const PricingScreen({super.key, required this.draft});

  final AddVehicleDraft draft;

  @override
  State<PricingScreen> createState() => _PricingScreenState();
}

class _PricingScreenState extends State<PricingScreen> {
  final _formKey = GlobalKey<FormState>();
  late final _dailyController = TextEditingController(
    text: widget.draft.dailyRate,
  );
  late final _weeklyController = TextEditingController(
    text: widget.draft.weeklyRate,
  );
  late final _monthlyController = TextEditingController(
    text: widget.draft.monthlyRate,
  );
  late String _availableFor = widget.draft.availableFor;
  late String _status = widget.draft.status;

  @override
  void dispose() {
    _dailyController.dispose();
    _weeklyController.dispose();
    _monthlyController.dispose();
    super.dispose();
  }

  double? _validRate(String? value, {required bool required}) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) return required ? -1 : null;
    final rate = double.tryParse(trimmed);
    if (rate == null || !rate.isFinite || rate <= 0) return -1;
    return rate;
  }

  String? _validateRate(String? value, {required bool required}) {
    final rate = _validRate(value, required: required);
    if (rate == null) return null;
    if (rate < 0) {
      return required && (value == null || value.trim().isEmpty)
          ? 'This rate is required'
          : 'Enter a number greater than 0';
    }
    return null;
  }

  void _onContinue() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    widget.draft
      ..dailyRate = _dailyController.text.trim()
      ..weeklyRate = _weeklyController.text.trim()
      ..monthlyRate = _monthlyController.text.trim()
      ..availableFor = _availableFor
      ..status = _status;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PhotosDetailsScreen(draft: widget.draft),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AddVehicleScaffold(
      title: 'Pricing & Availability',
      step: 3,
      primaryLabel: 'Continue to Photos',
      onPrimary: _onContinue,
      child: Form(
        key: _formKey,
        child: FormCard(
          title: 'Pricing & Availability',
          subtitle: 'Set the rental rates and availability status.',
          icon: Icons.sell_outlined,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const FieldLabel('Available For'),
              _ChoiceRow(
                labels: const ['Daily', 'Weekly', 'Monthly'],
                selected: ['Daily', 'Weekly', 'Monthly'].indexOf(_availableFor),
                onSelect: (index) => setState(
                  () => _availableFor = ['Daily', 'Weekly', 'Monthly'][index],
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Rates use the currency configured by the Finovo server.',
                style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 10),
              const FieldLabel('Daily Rate', required: true),
              FormInput(
                hint: 'e.g. 45.00',
                controller: _dailyController,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                validator: (value) => _validateRate(value, required: true),
              ),
              const SizedBox(height: 12),
              const FieldLabel('Weekly Rate', required: true),
              FormInput(
                hint: 'e.g. 280.00',
                controller: _weeklyController,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                validator: (value) => _validateRate(value, required: true),
              ),
              const SizedBox(height: 12),
              const FieldLabel('Monthly Rate', required: true),
              FormInput(
                hint: 'e.g. 1100.00',
                controller: _monthlyController,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                validator: (value) => _validateRate(value, required: true),
              ),
              const SizedBox(height: 14),
              const FieldLabel('Status'),
              _StatusRow(
                selected: _status,
                onSelect: (value) => setState(() => _status = value),
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
                style: TextStyle(
                  fontSize: 11,
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

class _StatusRow extends StatelessWidget {
  const _StatusRow({required this.selected, required this.onSelect});

  final String selected;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    const statuses = {
      'Available': 'AVAILABLE',
      'Rented': 'RENTED',
      'Maintenance': 'MAINTENANCE',
    };
    const colors = {
      'AVAILABLE': Color(0xff198754),
      'RENTED': Color(0xff2563eb),
      'MAINTENANCE': Color(0xffc0840b),
    };
    return Row(
      children: statuses.entries.map((entry) {
        final isSelected = selected == entry.value;
        final color = colors[entry.value]!;
        return Expanded(
          child: InkWell(
            onTap: () => onSelect(entry.value),
            borderRadius: BorderRadius.circular(8),
            child: Container(
              margin: const EdgeInsets.only(right: 5),
              padding: const EdgeInsets.symmetric(vertical: 11, horizontal: 4),
              decoration: BoxDecoration(
                color: isSelected
                    ? color.withValues(alpha: .1)
                    : AppColors.background,
                border: Border.all(
                  color: isSelected ? color : const Color(0xffe1e1e5),
                ),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                entry.key,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 11,
                  color: color,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}
