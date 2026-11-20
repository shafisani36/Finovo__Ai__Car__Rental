import 'package:material_ui/material_ui.dart';
import 'package:rental_car/app/theme/app_text_theme.dart';
import 'package:rental_car/core/widgets/app_text_field.dart';
import 'package:rental_car/core/widgets/app_field_label.dart';
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

  late final Set<String> _availableFor = {
    'Daily',
    ...widget.draft.availableFor
        .split(',')
        .map((e) => e.trim())
        .where((e) => e == 'Weekly' || e == 'Monthly'),
  };
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
      ..weeklyRate = _availableFor.contains('Weekly')
          ? _weeklyController.text.trim()
          : ''
      ..monthlyRate = _availableFor.contains('Monthly')
          ? _monthlyController.text.trim()
          : ''
      ..availableFor = _availableFor.join(',')
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
              const AppFieldLabel('Available For'),
              Row(
                children: ['Daily', 'Weekly', 'Monthly'].map((label) {
                  final on = _availableFor.contains(label);
                  return Expanded(
                    child: InkWell(
                      onTap: label == 'Daily'
                          ? null
                          : () => setState(() {
                              on
                                  ? _availableFor.remove(label)
                                  : _availableFor.add(label);
                            }),
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        margin: const EdgeInsets.only(right: 5),
                        padding: const EdgeInsets.symmetric(vertical: 11),
                        decoration: BoxDecoration(
                          color: on
                              ? AppColors.primary
                              : AppColors.gray.withValues(alpha: 0.5),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            if (on)
                              const Icon(
                                Icons.check,
                                size: 14,
                                color: AppColors.white,
                              ),
                            const SizedBox(width: 4),
                            Text(
                              label,
                              style: AppTextStyles.subtitle3.copyWith(
                                color: on ? AppColors.white : AppColors.black,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 12),
              AppTextField(
                hint: 'e.g. 45.00',
                controller: _dailyController,
                required: true,
                label: 'Daily Rate',
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                textInputAction: .next,
                validator: (value) => _validateRate(value, required: true),
              ),
              if (_availableFor.contains('Weekly')) ...[
                const SizedBox(height: 12),
                AppTextField(
                  hint: 'e.g. 280.00',
                  controller: _weeklyController,
                  label: 'Weekly Rate',
                  required: true,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  textInputAction: .next,
                  validator: (value) => _validateRate(value, required: true),
                ),
              ],
              if (_availableFor.contains('Monthly')) ...[
                const SizedBox(height: 12),
                AppTextField(
                  hint: 'e.g. 1100.00',
                  controller: _monthlyController,
                  label: 'Monthly Rate',
                  required: true,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  textInputAction: .done,
                  validator: (value) => _validateRate(value, required: true),
                ),
              ],
              const SizedBox(height: 12),
              const AppFieldLabel('Status'),
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
                style: AppTextStyles.subtitle3.copyWith(
                  color: color,
                  fontWeight: .w600,
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}
