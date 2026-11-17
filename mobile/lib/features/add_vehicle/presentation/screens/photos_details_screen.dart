import 'package:flutter/material.dart';
import 'package:rental_car/features/add_vehicle/presentation/widgets/form_card.dart';

import '../../../../app/theme/app_colors.dart';
import '../widgets/add_vehicle_scaffold.dart';
import 'review_publish_screen.dart';

class PhotosDetailsScreen extends StatelessWidget {
  const PhotosDetailsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AddVehicleScaffold(
      title: 'Photos & Details',
      step: 4,
      primaryLabel: 'Review & Publish',
      onPrimary: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ReviewPublishScreen())),
      child: Column(
        children: [
          FormCard(
            title: 'Photo',
            subtitle: 'Add a high-quality photo of the vehicle',
            icon: Icons.image_outlined,
            child: Container(
              height: 170,
              width: double.infinity,
              decoration: BoxDecoration(color: AppColors.primary10, border: Border.all(color: AppColors.primary, style: BorderStyle.solid), borderRadius: BorderRadius.circular(8)),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.file_upload_outlined, color: AppColors.primary, size: 30),
                  const SizedBox(height: 8),
                  const Text('Drag a photo here or browse'),
                  Text('PNG, JPG or WEBP (max 10MB)', style: TextStyle(fontSize: 10, color: AppColors.textSecondary)),
                  const SizedBox(height: 10),
                  OutlinedButton(onPressed: () {}, child: const Text('Choose file')),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
          const FormCard(
            title: 'Description',
            subtitle: 'Add notes and additional features',
            icon: Icons.notes_outlined,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                FieldLabel('Notes'),
                FormInput(hint: 'Condition, history, standout features...'),
              ],
            ),
          ),
          const SizedBox(height: 14),
          FormCard(
            title: 'Public Catalog',
            subtitle: 'Visibility settings for customers',
            icon: Icons.public,
            child: SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Show in public catalog', style: TextStyle(fontSize: 12)),
              value: true,
              onChanged: (_) {},
            ),
          ),
        ],
      ),
    );
  }
}
