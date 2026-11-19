import 'package:flutter/material.dart';
import 'package:rental_car/app/theme/app_colors.dart';
import 'package:rental_car/app/theme/app_text_theme.dart';

/// Label shown above any form field. Adds a red * when [required] is true.
class AppFieldLabel extends StatelessWidget {
  const AppFieldLabel(this.label, {super.key, this.required = false});

  final String label;
  final bool required;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: RichText(
        text: TextSpan(
          text: label,
          style: AppTextStyles.subtitle3.copyWith(
            color: AppColors.textPrimary,
            fontWeight: .w600,
          ),
          children: required
              ? const [
                  TextSpan(
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

/// Small grey helper text shown under a field (e.g. "Max 100 chars").
class AppFieldHelper extends StatelessWidget {
  const AppFieldHelper(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Text(
        text,
        style: AppTextStyles.subtitle3.copyWith(
          color: AppColors.textSecondary,
          fontSize: 11,
        ),
      ),
    );
  }
}
