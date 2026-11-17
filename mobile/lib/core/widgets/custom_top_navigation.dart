import 'package:flutter/material.dart';

import '../../app/theme/app_colors.dart';
import '../../app/theme/app_text_theme.dart';

/// Top app bar: back arrow + page title, optional cart icon (with badge).
/// Use as `Scaffold(appBar: CustomTopNavigation(...))`.
///
/// ```dart
/// CustomTopNavigation(title: 'Food', showCart: true, cartCount: 2, onCartTap: () => context.push(Routes.cart))
/// CustomTopNavigation(title: 'Orders', bottom: CustomTabBar(tabs: [...]))
/// ```

class CustomTopNavigation extends StatelessWidget
    implements PreferredSizeWidget {
  const CustomTopNavigation({
    super.key,
    required this.title,
    this.showBackButton = false,
    this.onBack,
    this.actions,
    this.bottom,
    this.centerTitle = false,
    this.backgroundColor = AppColors.primary,
    this.elevation = 0,
    this.titleStyle,
  });

  final String title;
  final bool showBackButton;
  final VoidCallback? onBack;
  final List<Widget>? actions;
  final PreferredSizeWidget? bottom;
  final bool centerTitle;
  final Color backgroundColor;
  final double elevation;
  final TextStyle? titleStyle;

  @override
  Size get preferredSize =>
      Size.fromHeight(kToolbarHeight + (bottom?.preferredSize.height ?? 0));

  @override
  Widget build(BuildContext context) {
    return AppBar(
      automaticallyImplyLeading: false,
      backgroundColor: backgroundColor,
      surfaceTintColor: Colors.transparent,
      elevation: elevation,
      scrolledUnderElevation: elevation,
      shadowColor: const Color(0x33000000),
      centerTitle: centerTitle,
      titleSpacing: showBackButton ? 0 : 16,
      leading: showBackButton
          ? IconButton(
              onPressed: onBack ?? () => Navigator.of(context).maybePop(),
              icon: const Icon(Icons.arrow_back, size: 24),
              color: AppColors.textPrimary,
              tooltip: MaterialLocalizations.of(context).backButtonTooltip,
            )
          : Builder(
              builder: (context) => IconButton(
                onPressed: () {
                  Scaffold.of(context).openDrawer();
                },
                icon: const Icon(Icons.menu),
              ),
            ),
      title: Row(
        children: [
          Image.asset(
            'assets/images/logo.png',
            height: 40,
            filterQuality: .high,
          ),
          const SizedBox(width: 10),
          Text(
            title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: titleStyle,
          ),
        ],
      ),

      actions: [
        const Padding(
          padding: .only(right: 15, bottom: 5),
          child: Row(
            children: [
              Icon(Icons.notifications_outlined, color: AppColors.white),
              SizedBox(width: 15),
              CircleAvatar(
                backgroundColor: Color(0xff1E3A5F),
                child: Text("NR", style: AppTextStyles.heading6),
              ),
            ],
          ),
        ),
      ],
      bottom: bottom,
    );
  }
}
