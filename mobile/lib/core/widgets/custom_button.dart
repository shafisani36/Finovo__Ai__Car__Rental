import 'package:flutter/material.dart';

import '../../app/theme/app_colors.dart';
import '../../app/theme/app_text_theme.dart';

enum CustomButtonVariant { primary, outlined, accent }

/// ```dart
/// CustomButton(label: 'Sign in', onPressed: _submit)
/// CustomButton(label: 'Cancel', variant: CustomButtonVariant.outlined, onPressed: _back)
/// CustomButton(label: 'Pay', isLoading: true, onPressed: _pay)
/// CustomButton(label: 'Add to cart', onPressed: null) // disabled
/// ```

class CustomButton extends StatelessWidget {
  const CustomButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = CustomButtonVariant.primary,
    this.isLoading = false,
    this.isExpanded = true,
    this.width,
    this.height = 48,
    this.borderRadius = 8,
    this.leadingIcon,
    this.trailingIcon,
    this.iconSize = 20,
    this.textStyle,
    this.padding = const EdgeInsets.symmetric(horizontal: 16),
    this.backgroundColor,
    this.foregroundColor,
    this.borderColor,
  });

  final String label;
  final VoidCallback? onPressed;
  final CustomButtonVariant variant;
  final bool isLoading;
  final bool isExpanded;
  final double? width;
  final double height;
  final double borderRadius;
  final IconData? leadingIcon;
  final IconData? trailingIcon;
  final double iconSize;
  final TextStyle? textStyle;
  final EdgeInsetsGeometry padding;
  final Color? backgroundColor;
  final Color? foregroundColor;
  final Color? borderColor;

  bool get _isOutlined => variant == CustomButtonVariant.outlined;
  bool get _isAccent => variant == CustomButtonVariant.accent;

  bool _isDisabled(Set<WidgetState> s) =>
      s.contains(WidgetState.disabled) && !isLoading;

  Color _background(Set<WidgetState> s) {
    final active =
        s.contains(WidgetState.hovered) || s.contains(WidgetState.pressed);

    if (_isOutlined) {
      if (_isDisabled(s)) return Colors.transparent;
      if (active) return AppColors.primary10;
      return backgroundColor ?? Colors.transparent;
    }

    if (_isDisabled(s)) return AppColors.gray;
    if (backgroundColor != null) return backgroundColor!;
    if (_isAccent) {
      return active ? AppColors.primary70 : AppColors.primary50;
    }
    return active ? AppColors.secondary70 : AppColors.secondary50;
  }

  Color _foreground(Set<WidgetState> s) {
    if (_isDisabled(s)) return _isOutlined ? AppColors.gray : AppColors.white;
    return foregroundColor ??
        (_isOutlined ? AppColors.primary50 : AppColors.primary);
  }

  BorderSide _side(Set<WidgetState> s) {
    if (!_isOutlined) return BorderSide.none;
    if (_isDisabled(s)) return const BorderSide(color: AppColors.gray);
    return BorderSide(
      color: borderColor ?? foregroundColor ?? AppColors.primary50,
    );
  }

  Widget _buildContent() {
    if (isLoading) {
      return SizedBox(
        width: 20,
        height: 20,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          valueColor: AlwaysStoppedAnimation<Color>(_foreground(const {})),
        ),
      );
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (leadingIcon != null) ...[
          Icon(leadingIcon, size: iconSize),
          const SizedBox(width: 8),
        ],
        Flexible(
          child: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis),
        ),
        if (trailingIcon != null) ...[
          const SizedBox(width: 8),
          Icon(trailingIcon, size: iconSize),
        ],
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final style = ButtonStyle(
      elevation: const WidgetStatePropertyAll(0),
      backgroundColor: WidgetStateProperty.resolveWith(_background),
      foregroundColor: WidgetStateProperty.resolveWith(_foreground),
      iconColor: WidgetStateProperty.resolveWith(_foreground),
      side: WidgetStateProperty.resolveWith(_side),
      overlayColor: const WidgetStatePropertyAll(Colors.transparent),
      padding: WidgetStatePropertyAll(padding),
      minimumSize: WidgetStatePropertyAll(Size(0, height)),
      shape: WidgetStatePropertyAll(
        RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(borderRadius),
        ),
      ),
      textStyle: WidgetStatePropertyAll(textStyle ?? AppTextStyles.heading6),
    );

    final VoidCallback? onTap = isLoading ? null : onPressed;
    final child = _buildContent();

    return SizedBox(
      width: isExpanded ? double.infinity : width,
      height: height,
      child: _isOutlined
          ? OutlinedButton(onPressed: onTap, style: style, child: child)
          : ElevatedButton(onPressed: onTap, style: style, child: child),
    );
  }
}
