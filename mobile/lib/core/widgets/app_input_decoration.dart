import 'package:flutter/material.dart';
import 'package:rental_car/app/theme/app_colors.dart';
import 'package:rental_car/app/theme/app_text_theme.dart';

/// Single source of truth for how every input looks (Figma style):
/// light grey fill, 12px radius, no border, grey hint.
/// Swap the colors below for your AppColors tokens if you have them.
class AppInputDecoration {
  AppInputDecoration._();

  static const Color fill = Color(0xFFF1F2F4);
  static const Color hint = Color(0xFF9CA3AF);
  static const double radius = 12;

  static OutlineInputBorder _border([Color color = Colors.transparent]) =>
      OutlineInputBorder(
        borderRadius: BorderRadius.circular(radius),
        borderSide: BorderSide(color: color, width: 1),
      );

  static InputDecoration build({
    String? hint,
    IconData? prefixIcon,
    Widget? suffix,
  }) {
    return InputDecoration(
      hintText: hint,
      hintStyle: AppTextStyles.subtitle3.copyWith(
        color: AppInputDecoration.hint,
      ),
      counterText: '',
      filled: true,
      fillColor: fill,
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      prefixIcon: prefixIcon == null ? null : Icon(prefixIcon, size: 18),
      suffixIcon: suffix,
      border: _border(),
      enabledBorder: _border(),
      disabledBorder: _border(),
      focusedBorder: _border(AppColors.primary),
      errorBorder: _border(Colors.red),
      focusedErrorBorder: _border(Colors.red),
    );
  }
}
