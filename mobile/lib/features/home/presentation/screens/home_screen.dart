import 'dart:async';

import 'package:cupertino_ui/cupertino_ui.dart';
import 'package:material_ui/material_ui.dart';
import 'package:rental_car/app/theme/app_colors.dart';
import 'package:rental_car/app/theme/app_text_theme.dart';
import 'package:rental_car/core/network/api_client.dart';
import 'package:rental_car/core/widgets/custom_top_navigation.dart';
import 'package:rental_car/features/add_vehicle/models/add_vehicle_draft.dart';
import 'package:rental_car/features/add_vehicle/presentation/screens/vehicle_info_screen.dart';
import 'package:rental_car/features/auth/presentation/staff_login_screen.dart';
import 'package:rental_car/features/home/data/home_fleet_repository.dart';
import 'package:rental_car/features/home/presentation/home_fleet_controller.dart';
import 'package:rental_car/features/home/presentation/widgets/cars_list_section.dart';
import 'package:rental_car/features/home/presentation/widgets/home_drawer.dart';
import 'package:rental_car/features/home/presentation/widgets/home_header_section.dart';
import 'package:rental_car/features/home/presentation/widgets/vehicle_stats_section.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, this.repository});

  final HomeFleetRepository? repository;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late final HomeFleetController _controller = HomeFleetController(
    repository: widget.repository ?? ApiHomeFleetRepository(),
  );
  bool _loginRouteOpen = false;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_handleControllerChange);
    if (apiClient.hasSession) unawaited(_controller.load());
  }

  @override
  void dispose() {
    _controller
      ..removeListener(_handleControllerChange)
      ..dispose();
    super.dispose();
  }

  void _handleControllerChange() {
    if (!_controller.requiresSignIn || _loginRouteOpen) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _controller.requiresSignIn && !_loginRouteOpen) {
        unawaited(_openSignIn());
      }
    });
  }

  Future<void> _openAddCar() async {
    final Widget page = apiClient.hasSession
        ? VehicleInfoScreen(draft: AddVehicleDraft())
        : const StaffLoginScreen();
    final result = await Navigator.push<bool>(
      context,
      CupertinoPageRoute<bool>(
        settings: const RouteSettings(name: addVehicleFlowRouteName),
        builder: (_) => page,
      ),
    );
    if (!mounted) return;
    if (result == true && apiClient.hasSession) {
      await _controller.load();
    }
  }

  Future<void> _openSignIn() async {
    if (_loginRouteOpen) return;
    _loginRouteOpen = true;
    try {
      final result = await Navigator.push<bool>(
        context,
        CupertinoPageRoute<bool>(
          builder: (_) => const StaffLoginScreen(continueToAddVehicle: false),
        ),
      );
      if (mounted && result == true && apiClient.hasSession) {
        await _controller.load();
      }
    } finally {
      _loginRouteOpen = false;
    }
  }

  Future<void> _refresh() async {
    if (apiClient.hasSession) {
      await _controller.load();
    } else {
      await _openSignIn();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomTopNavigation(title: 'Finovo', showBackButton: false),
      drawer: const HomeDrawer(),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _refresh,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 15),
            child: AnimatedBuilder(
              animation: _controller,
              builder: (context, _) {
                final signedIn = apiClient.hasSession;
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 20),
                    HomeHeaderSection(onAddCar: _openAddCar),
                    const SizedBox(height: 20),
                    if (!signedIn || _controller.requiresSignIn)
                      _buildSignInPrompt()
                    else ...[
                      VehicleStatsSection(
                        stats: _controller.stats,
                        loading: _controller.loading,
                      ),
                      const SizedBox(height: 16),
                      CarsListSection(
                        controller: _controller,
                        onSignIn: _openSignIn,
                      ),
                    ],
                    const SizedBox(height: 20),
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSignInPrompt() => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(18),
    decoration: BoxDecoration(
      color: AppColors.white,
      borderRadius: BorderRadius.circular(14),
      boxShadow: const [
        BoxShadow(
          color: Color(0x10000000),
          blurRadius: 10,
          offset: Offset(0, 3),
        ),
      ],
    ),
    child: Column(
      children: [
        const Icon(Icons.lock_outline, size: 30, color: AppColors.primary),
        const SizedBox(height: 8),
        Text('Sign in to view your fleet', style: AppTextStyles.heading6),
        const SizedBox(height: 4),
        Text(
          'A staff account is required to load vehicle statistics and cars.',
          textAlign: TextAlign.center,
          style: AppTextStyles.subtitle3.copyWith(
            color: AppColors.textSecondary,
          ),
        ),
        const SizedBox(height: 8),
        OutlinedButton(
          onPressed: _openSignIn,
          child: const Text('Staff sign in'),
        ),
      ],
    ),
  );
}
