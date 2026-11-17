import 'package:flutter/material.dart';

import 'app_colors.dart';
import 'app_text_theme.dart';

abstract final class AppTheme {
  static const double _radius = 8;

  static ThemeData get light {
    const colorScheme = ColorScheme.light(
      primary: AppColors.primary,
      onPrimary: AppColors.white,
      secondary: AppColors.textSecondary,
      onSecondary: AppColors.white,
      onTertiary: AppColors.white,
      onError: AppColors.white,
      surface: AppColors.white,
      onSurface: AppColors.textPrimary,
    );

    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(_radius),
    );

    return ThemeData(
      useMaterial3: true,
      fontFamily: AppTextStyles.fontFamily,
      colorScheme: colorScheme,
      primaryColor: AppColors.primary,
      scaffoldBackgroundColor: AppColors.background,
      textTheme: AppTextTheme.textTheme,

      // ── Top navigation ──
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.textPrimary,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: AppTextStyles.heading4.copyWith(color: AppColors.white),
        iconTheme: const IconThemeData(color: AppColors.white),
      ),

      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: AppColors.primary,
          disabledBackgroundColor: AppColors.gray,
          disabledForegroundColor: AppColors.white,
          elevation: 0,
          minimumSize: const Size.fromHeight(40),
          shape: shape,
          textStyle: AppTextStyles.heading6,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.primary,
          disabledForegroundColor: AppColors.gray,
          side: const BorderSide(color: AppColors.primary),
          minimumSize: const Size.fromHeight(40),
          shape: shape,
          textStyle: AppTextStyles.heading6,
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.primary,
          textStyle: AppTextStyles.subtitle2,
        ),
      ),
    );
  }
}
