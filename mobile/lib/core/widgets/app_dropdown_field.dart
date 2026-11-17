import 'package:flutter/material.dart';
import 'package:rental_car/app/theme/app_colors.dart';
import 'package:rental_car/app/theme/app_text_theme.dart';
import 'package:rental_car/core/widgets/app_field_label.dart';
import 'package:rental_car/core/widgets/app_input_decoration.dart';

/// Global dropdown: label + required star + dropdown + optional helper text.
///
/// Works with any type:
/// ```dart
/// AppDropdownField<String>(
///   label: 'Brand',
///   required: true,
///   hint: 'Select brand',
///   items: ['Toyota', 'Honda'],
///   value: brand,
///   onChanged: (v) => setState(() => brand = v),
/// )
/// ```
/// Use [itemLabel] when T is not a String (e.g. `(y) => y.toString()`).

class AppDropdownField<T> extends StatelessWidget {
  const AppDropdownField({
    super.key,
    required this.items,
    required this.onChanged,
    this.label,
    this.hint,
    this.helperText,
    this.value,
    this.required = false,
    this.itemLabel,
    this.validator,
    this.enabled = true,
    this.prefixIcon,
  });

  final List<T> items;
  final ValueChanged<T?> onChanged;
  final String? label;
  final String? hint;
  final String? helperText;
  final T? value;
  final bool required;
  final String Function(T item)? itemLabel;
  final String? Function(T?)? validator;
  final bool enabled;
  final IconData? prefixIcon;

  String _text(T item) => itemLabel?.call(item) ?? item.toString();

  @override
  Widget build(BuildContext context) {
    final textStyle = AppTextStyles.subtitle3.copyWith(
      color: AppColors.textPrimary,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label != null) AppFieldLabel(label!, required: required),
        DropdownButtonFormField<T>(
          initialValue: value,
          isExpanded: true,
          icon: const Icon(Icons.keyboard_arrow_down),
          style: textStyle,
          dropdownColor: AppColors.white,
          borderRadius: BorderRadius.circular(12),
          hint: hint == null ? null : Text(hint!, style: textStyle),
          items: [
            for (final item in items)
              DropdownMenuItem<T>(
                value: item,
                child: Text(_text(item), style: textStyle),
              ),
          ],
          onChanged: enabled ? onChanged : null,
          validator:
              validator ??
              (required
                  ? (v) => v == null
                        ? '${label ?? 'This field'} is required'
                        : null
                  : null),
          decoration: AppInputDecoration.build(prefixIcon: prefixIcon),
        ),
        if (helperText != null) AppFieldHelper(helperText!),
      ],
    );
  }
}
