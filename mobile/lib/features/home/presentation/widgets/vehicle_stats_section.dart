import 'package:flutter/material.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_text_theme.dart';

class VehicleStatsSection extends StatelessWidget {
  const VehicleStatsSection({super.key});

  static const _stats = [
    _VehicleStat(
      value: '8',
      label: 'Total Cars',
      icon: Icons.directions_car_outlined,
      iconColor: AppColors.primary,
      iconBackgroundColor: AppColors.primary10,
    ),
    _VehicleStat(
      value: '3',
      label: 'Available',
      icon: Icons.check_circle_outline,
      iconColor: Color(0xff0f9f68),
      iconBackgroundColor: Color(0xffe6f7ef),
    ),
    _VehicleStat(
      value: '2',
      label: 'Rented',
      icon: Icons.access_time,
      iconColor: Color(0xff2563eb),
      iconBackgroundColor: Color(0xffe7eeff),
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 66,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        clipBehavior: .none,
        itemCount: _stats.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, index) => _StatCard(stat: _stats[index]),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.stat});

  final _VehicleStat stat;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 140,
      padding: const .symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [
          BoxShadow(
            color: Color(0x12000000),
            blurRadius: 8,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: stat.iconBackgroundColor,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(stat.icon, size: 16, color: stat.iconColor),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  stat.value,
                  style: AppTextStyles.heading6.copyWith(fontSize: 18),
                ),
                Text(
                  stat.label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTextStyles.subtitle3.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _VehicleStat {
  const _VehicleStat({
    required this.value,
    required this.label,
    required this.icon,
    required this.iconColor,
    required this.iconBackgroundColor,
  });

  final String value;
  final String label;
  final IconData icon;
  final Color iconColor;
  final Color iconBackgroundColor;
}
