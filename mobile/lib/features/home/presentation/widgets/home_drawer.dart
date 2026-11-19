import 'package:flutter/material.dart';
import 'package:rental_car/core/network/api_client.dart';

import '../../../../app/theme/app_colors.dart';
import '../../../../app/theme/app_text_theme.dart';

class HomeDrawer extends StatefulWidget {
  const HomeDrawer({super.key});

  @override
  State<HomeDrawer> createState() => _HomeDrawerState();
}

class _HomeDrawerState extends State<HomeDrawer> {
  bool _isLightMode = true;

  @override
  Widget build(BuildContext context) {
    return Drawer(
      backgroundColor: AppColors.primary,
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 15),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 15),
              _buildBrand(),
              const SizedBox(height: 30),
              _DrawerItem(
                icon: Icons.home_outlined,
                label: 'Dashboard',
                onTap: () => Navigator.pop(context),
              ),
              const SizedBox(height: 15),
              _DrawerItem(
                icon: Icons.directions_car_outlined,
                label: 'Cars',
                isSelected: true,
                onTap: () => Navigator.pop(context),
              ),
              const Spacer(),
              _buildLightModeToggle(),
              const Divider(color: Color(0x335e2a5b), height: 24),
              _DrawerItem(
                icon: Icons.logout,
                label: 'Log out',
                onTap: () async {
                  Navigator.pop(context);
                  if (!apiClient.hasSession) return;
                  try {
                    await apiClient.logout();
                  } on ApiException catch (error) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(error.message),
                          backgroundColor: Colors.red,
                        ),
                      );
                    }
                  }
                },
              ),
              const SizedBox(height: 18),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBrand() {
    return Row(
      children: [
        Image.asset(
          'assets/images/logo.png',
          width: 40,
          height: 40,
          filterQuality: .high,
        ),
        const SizedBox(width: 7),
        Text(
          'Finovo',
          style: AppTextStyles.heading3.copyWith(color: AppColors.white),
        ),
      ],
    );
  }

  Widget _buildLightModeToggle() {
    return Row(
      children: [
        const Icon(Icons.wb_sunny_outlined, size: 15, color: AppColors.white),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            'Light mode',
            style: AppTextStyles.subtitle2.copyWith(
              color: AppColors.white,
              fontSize: 14,
            ),
          ),
        ),
        Switch(
          value: _isLightMode,
          onChanged: (value) => setState(() => _isLightMode = value),
          activeThumbColor: AppColors.primary,
          activeTrackColor: AppColors.white,
          inactiveThumbColor: AppColors.white,
          inactiveTrackColor: AppColors.primary70,
        ),
      ],
    );
  }
}

class _DrawerItem extends StatelessWidget {
  const _DrawerItem({
    required this.icon,
    required this.label,
    required this.onTap,
    this.isSelected = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool isSelected;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: isSelected ? const Color(0xff5a1b58) : Colors.transparent,
      borderRadius: BorderRadius.circular(7),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(7),
        child: SizedBox(
          height: 36,
          child: Row(
            children: [
              const SizedBox(width: 10),
              Icon(icon, size: 22, color: AppColors.white),
              const SizedBox(width: 12),
              Text(
                label,
                style: AppTextStyles.body1.copyWith(color: AppColors.white),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
