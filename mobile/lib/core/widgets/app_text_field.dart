import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:rental_car/core/widgets/app_field_label.dart';
import 'package:rental_car/core/widgets/app_input_decoration.dart';

/// Global text field: label + required star + input + optional helper text.
///
/// If [maxLength] is set and [helperText] is null, the helper automatically
/// reads "Max maxLength chars".

class AppTextField extends StatelessWidget {
  const AppTextField({
    super.key,
    this.label,
    this.hint,
    this.helperText,
    this.required = false,
    this.maxLength,
    this.maxLines = 1,
    this.controller,
    this.initialValue,
    this.validator,
    this.onChanged,
    this.keyboardType,
    this.textInputAction,
    this.textCapitalization = TextCapitalization.none,
    this.inputFormatters,
    this.prefixIcon,
    this.suffix,
    this.obscureText = false,
    this.readOnly = false,
    this.enabled = true,
    this.onTap,
    this.autovalidateMode,
  });

  final String? label;
  final String? hint;
  final String? helperText;
  final bool required;
  final int? maxLength;
  final int maxLines;
  final TextEditingController? controller;
  final String? initialValue;
  final String? Function(String?)? validator;
  final ValueChanged<String>? onChanged;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final TextCapitalization textCapitalization;
  final List<TextInputFormatter>? inputFormatters;
  final IconData? prefixIcon;
  final Widget? suffix;
  final bool obscureText;
  final bool readOnly;
  final bool enabled;
  final VoidCallback? onTap;
  final AutovalidateMode? autovalidateMode;

  @override
  Widget build(BuildContext context) {
    final helper =
        helperText ?? (maxLength != null ? 'Max $maxLength chars' : null);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label != null) AppFieldLabel(label!, required: required),
        TextFormField(
          controller: controller,
          initialValue: controller == null ? initialValue : null,
          maxLength: maxLength,
          maxLines: maxLines,
          obscureText: obscureText,
          readOnly: readOnly,
          enabled: enabled,
          onTap: onTap,
          keyboardType: keyboardType,
          textInputAction: textInputAction,
          textCapitalization: textCapitalization,
          inputFormatters: inputFormatters,
          onChanged: onChanged,
          autovalidateMode: autovalidateMode,
          validator:
              validator ??
              (required
                  ? (v) => (v == null || v.trim().isEmpty)
                        ? '${label ?? 'This field'} is required'
                        : null
                  : null),
          decoration: AppInputDecoration.build(
            hint: hint,
            prefixIcon: prefixIcon,
            suffix: suffix,
          ),
        ),
        if (helper != null) AppFieldHelper(helper),
      ],
    );
  }
}
