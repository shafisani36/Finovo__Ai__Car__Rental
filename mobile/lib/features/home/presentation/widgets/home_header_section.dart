import 'package:material_ui/material_ui.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_text_theme.dart';
import '../../../../core/widgets/custom_button.dart';

class HomeHeaderSection extends StatelessWidget {
  const HomeHeaderSection({super.key, required this.onAddCar});

  final VoidCallback onAddCar;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Cars', style: AppTextStyles.heading3),
              const SizedBox(height: 2),
              Text(
                'Manage your vehicle fleet. Add new cars, edit details, or update availability',
                style: AppTextStyles.subtitle2.copyWith(
                  color: AppColors.textSecondary,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 15),
        CustomButton(
          label: 'Add Car',
          onPressed: onAddCar,
          isExpanded: false,
          borderRadius: 12,
          leadingIcon: Icons.add,
          iconSize: 12,
        ),
      ],
    );
  }
}
