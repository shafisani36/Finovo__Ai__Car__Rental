import 'package:material_ui/material_ui.dart';
import 'package:rental_car/core/widgets/custom_button.dart';
import 'package:rental_car/core/widgets/custom_top_navigation.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_text_theme.dart';

class AddVehicleScaffold extends StatelessWidget {
  const AddVehicleScaffold({
    super.key,
    required this.title,
    required this.step,
    required this.child,
    required this.primaryLabel,
    required this.onPrimary,
    this.isSubmitting = false,
    this.secondaryLabel,
    this.onSecondary,
  });

  final String title;
  final int step;
  final Widget child;
  final String primaryLabel;
  final VoidCallback onPrimary;
  final bool isSubmitting;
  final String? secondaryLabel;
  final VoidCallback? onSecondary;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      child: Scaffold(
        appBar: CustomTopNavigation(
          title: "Finovo",
          bottom: PreferredSize(
            preferredSize: Size.fromHeight(60),
            child: Column(
              crossAxisAlignment: .start,
              children: [
                Divider(color: AppColors.divider),
                Padding(
                  padding: const .all(15),
                  child: Row(
                    children: [
                      Text(
                        title,
                        style: AppTextStyles.heading5.copyWith(
                          color: AppColors.white,
                        ),
                      ),
                      const Spacer(),
                      _ProgressIndicator(step: step),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        body: SafeArea(
          child: Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: child,
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                child: Row(
                  children: [
                    if (secondaryLabel != null) ...[
                      Expanded(
                        child: OutlinedButton(
                          onPressed: isSubmitting ? null : onSecondary,
                          child: Text(secondaryLabel!),
                        ),
                      ),
                      const SizedBox(width: 10),
                    ],
                    Expanded(
                      child: CustomButton(
                        label: primaryLabel,
                        onPressed: isSubmitting ? null : onPrimary,
                        isLoading: isSubmitting,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProgressIndicator extends StatelessWidget {
  const _ProgressIndicator({required this.step});

  final int step;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var index = 0; index < 5; index++)
          Container(
            width: index == step - 1 ? 14 : 6,
            height: 5,
            margin: const EdgeInsets.only(left: 4),
            decoration: BoxDecoration(
              color: index == step - 1
                  ? AppColors.secondary50
                  : const Color(0xff7c4779),
              borderRadius: BorderRadius.circular(4),
            ),
          ),
      ],
    );
  }
}

class FieldLabel extends StatelessWidget {
  const FieldLabel(this.label, {super.key, this.required = false});

  final String label;
  final bool required;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: RichText(
        text: TextSpan(
          text: label,
          style: AppTextStyles.subtitle3.copyWith(color: AppColors.textPrimary),
          children: required
              ? [
                  const TextSpan(
                    text: ' *',
                    style: TextStyle(color: Colors.red),
                  ),
                ]
              : null,
        ),
      ),
    );
  }
}

class FormInput extends StatelessWidget {
  const FormInput({
    super.key,
    this.hint,
    this.icon,
    this.suffix,
    this.controller,
    this.validator,
    this.keyboardType,
    this.maxLines = 1,
  });

  final String? hint;
  final IconData? icon;
  final Widget? suffix;
  final TextEditingController? controller;
  final String? Function(String?)? validator;
  final TextInputType? keyboardType;
  final int maxLines;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      validator: validator,
      keyboardType: keyboardType,
      maxLines: maxLines,
      decoration: InputDecoration(
        hintText: hint,
        suffixIcon: suffix,
        prefixIcon: icon == null ? null : Icon(icon, size: 18),
      ),
    );
  }
}
