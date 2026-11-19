import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:rental_car/core/widgets/custom_top_navigation.dart';
import 'package:rental_car/core/network/api_client.dart';
import 'package:rental_car/features/home/presentation/widgets/home_drawer.dart';
import 'package:rental_car/features/home/presentation/widgets/home_header_section.dart';
import 'package:rental_car/features/home/presentation/widgets/vehicle_stats_section.dart';
import 'package:rental_car/features/add_vehicle/presentation/screens/vehicle_info_screen.dart';
import 'package:rental_car/features/add_vehicle/models/add_vehicle_draft.dart';
import 'package:rental_car/features/auth/presentation/staff_login_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  void _openAddCar(BuildContext context) {
    final page = apiClient.hasSession
        ? VehicleInfoScreen(draft: AddVehicleDraft())
        : const StaffLoginScreen();
    Navigator.push(context, CupertinoPageRoute(builder: (_) => page));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomTopNavigation(title: "Finovo", showBackButton: false),
      drawer: const HomeDrawer(),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const .symmetric(horizontal: 15),
          child: Column(
            crossAxisAlignment: .start,
            children: [
              const SizedBox(height: 20),
              HomeHeaderSection(
                onAddCar: () {
                  _openAddCar(context);
                },
              ),
              const SizedBox(height: 20),
              const VehicleStatsSection(),
            ],
          ),
        ),
      ),
    );
  }
}
