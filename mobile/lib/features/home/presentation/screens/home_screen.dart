import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:rental_car/core/widgets/custom_top_navigation.dart';
import 'package:rental_car/features/home/presentation/widgets/home_drawer.dart';
import 'package:rental_car/features/home/presentation/widgets/home_header_section.dart';
import 'package:rental_car/features/home/presentation/widgets/vehicle_stats_section.dart';
import 'package:rental_car/features/add_vehicle/presentation/screens/vehicle_info_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

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
                  Navigator.push(
                    context,
                    CupertinoPageRoute(
                      builder: (context) {
                        return const VehicleInfoScreen();
                      },
                    ),
                  );
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
