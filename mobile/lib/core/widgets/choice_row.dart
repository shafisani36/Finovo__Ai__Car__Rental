import 'package:flutter/material.dart';
import 'package:rental_car/app/theme/app_colors.dart';
import 'package:rental_car/app/theme/app_text_theme.dart';

class ChoiceRow extends StatelessWidget {
  const ChoiceRow({
    super.key,
    required this.labels,
    required this.selected,
    required this.onSelect,
    this.itemSpacing = 4,
    this.itemPadding = const EdgeInsets.symmetric(vertical: 9),
    this.borderRadius = const BorderRadius.all(Radius.circular(8)),
    this.selectedColor = AppColors.primary,
    this.unselectedColor = AppColors.background,
    this.selectedBorderColor = AppColors.primary,
    this.unselectedBorderColor = const Color(0xffe1e1e5),
    this.selectedTextColor = Colors.white,
    this.unselectedTextColor = AppColors.textSecondary,
    this.textStyle,
  });

  final List<String> labels;
  final int selected;
  final ValueChanged<int> onSelect;
  final double itemSpacing;
  final EdgeInsetsGeometry itemPadding;
  final BorderRadius borderRadius;
  final Color selectedColor;
  final Color unselectedColor;
  final Color selectedBorderColor;
  final Color unselectedBorderColor;
  final Color selectedTextColor;
  final Color unselectedTextColor;
  final TextStyle? textStyle;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: labels.asMap().entries.map((entry) {
        final isSelected = entry.key == selected;
        return Expanded(
          child: InkWell(
            onTap: () => onSelect(entry.key),
            borderRadius: borderRadius,
            child: Container(
              margin: EdgeInsets.only(right: itemSpacing),
              padding: itemPadding,
              decoration: BoxDecoration(
                color: isSelected ? selectedColor : unselectedColor,
                borderRadius: borderRadius,
                border: Border.all(
                  color: isSelected
                      ? selectedBorderColor
                      : unselectedBorderColor,
                ),
              ),
              child: Text(
                entry.value,
                textAlign: TextAlign.center,
                style: (textStyle ?? AppTextStyles.subtitle3).copyWith(
                  color: isSelected ? selectedTextColor : unselectedTextColor,
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}
