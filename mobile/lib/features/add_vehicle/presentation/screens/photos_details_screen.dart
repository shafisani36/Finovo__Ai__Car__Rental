import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:rental_car/app/theme/app_colors.dart';
import 'package:rental_car/app/theme/app_text_theme.dart';
import 'package:rental_car/core/widgets/app_text_field.dart';
import 'package:rental_car/core/widgets/custom_button.dart';
import 'package:rental_car/features/add_vehicle/data/add_vehicle_repository.dart';
import 'package:rental_car/features/add_vehicle/models/add_vehicle_draft.dart';
import 'package:rental_car/features/add_vehicle/presentation/widgets/form_card.dart';

import '../widgets/add_vehicle_scaffold.dart';
import 'review_publish_screen.dart';

class PhotosDetailsScreen extends StatefulWidget {
  const PhotosDetailsScreen({super.key, required this.draft});

  final AddVehicleDraft draft;

  @override
  State<PhotosDetailsScreen> createState() => _PhotosDetailsScreenState();
}

class _PhotosDetailsScreenState extends State<PhotosDetailsScreen> {
  static const _maxPhotoBytes = 10 * 1024 * 1024;
  static const _maxUploadBytes = 36 * 1024 * 1024;

  final _picker = ImagePicker();
  final _notesController = TextEditingController();
  bool _isPublicCatalog = true;

  @override
  void initState() {
    super.initState();
    _notesController.text = widget.draft.notes;
    _isPublicCatalog = widget.draft.isPublicCatalog;
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _choosePhotos() async {
    final remaining = 6 - widget.draft.photos.length;
    if (remaining <= 0) {
      _showMessage('A maximum of 6 photos can be added.');
      return;
    }

    try {
      final selected = await _picker.pickMultiImage(
        limit: remaining,
        imageQuality: 85,
        maxWidth: 2048,
      );
      if (!mounted || selected.isEmpty) return;
      if (selected.length > remaining) {
        _showMessage('A maximum of 6 photos can be added.');
        return;
      }

      final additions = <PickedVehiclePhoto>[];
      var totalBytes = widget.draft.photos.fold<int>(
        0,
        (total, photo) => total + photo.bytes.length,
      );
      for (final image in selected) {
        final mimeType = _mimeType(image.name);
        if (mimeType == null) {
          if (!mounted) return;
          _showMessage('Choose PNG, JPG, or WEBP images only.');
          return;
        }
        final bytes = await image.readAsBytes();
        if (!mounted) return;
        if (bytes.length > _maxPhotoBytes) {
          _showMessage('${image.name} exceeds the 10 MB limit.');
          return;
        }
        totalBytes += bytes.length;
        if (totalBytes > _maxUploadBytes) {
          _showMessage('Selected photos exceed the upload size limit.');
          return;
        }
        additions.add(
          PickedVehiclePhoto(
            bytes: bytes,
            name: image.name,
            mimeType: mimeType,
          ),
        );
      }

      if (!mounted) return;
      setState(() {
        widget.draft.photos.addAll(additions);
        widget.draft.uploadedPhotos = null;
      });
    } catch (error) {
      if (mounted) _showMessage('Could not read the selected photos: $error');
    }
  }

  String? _mimeType(String name) {
    final extension = name.split('.').last.toLowerCase();
    return switch (extension) {
      'jpg' || 'jpeg' => 'image/jpeg',
      'png' => 'image/png',
      'webp' => 'image/webp',
      _ => null,
    };
  }

  void _removePhoto(int index) {
    setState(() {
      widget.draft.photos.removeAt(index);
      widget.draft.uploadedPhotos = null;
    });
  }

  void _continue() {
    if (widget.draft.photos.length < 4) {
      _showMessage('Add at least 4 vehicle photos to continue.');
      return;
    }
    widget.draft
      ..notes = _notesController.text.trim()
      ..isPublicCatalog = _isPublicCatalog;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ReviewPublishScreen(draft: widget.draft),
      ),
    );
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red.shade700),
    );
  }

  @override
  Widget build(BuildContext context) {
    final photos = widget.draft.photos;
    return AddVehicleScaffold(
      title: 'Photos & Details',
      step: 4,
      primaryLabel: 'Review & Publish',
      onPrimary: _continue,
      child: Column(
        children: [
          FormCard(
            title: 'Photos',
            subtitle: 'Add 4 to 6 high-quality vehicle photos',
            icon: Icons.image_outlined,
            child: Column(
              children: [
                Container(
                  height: 170,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: AppColors.primary10,
                    border: Border.all(color: AppColors.primary),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.file_upload_outlined,
                        color: AppColors.primary,
                        size: 30,
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Choose photos from your device',
                        style: AppTextStyles.subtitle3,
                      ),
                      const Text(
                        'PNG, JPG or WEBP (max 10MB each)',
                        style: TextStyle(
                          fontSize: 10,
                          color: AppColors.textSecondary,
                          fontWeight: .w600,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Padding(
                        padding: const .symmetric(horizontal: 12),
                        child: CustomButton(
                          label: "Choose file",
                          onPressed: _choosePhotos,
                          variant: .outlined,
                        ),
                      ),
                    ],
                  ),
                ),
                if (photos.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 92,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: photos.length,
                      separatorBuilder: (_, _) => const SizedBox(width: 8),
                      itemBuilder: (context, index) {
                        final photo = photos[index];
                        return Stack(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image.memory(
                                photo.bytes,
                                width: 92,
                                height: 92,
                                fit: BoxFit.cover,
                              ),
                            ),
                            Positioned(
                              top: 2,
                              right: 2,
                              child: IconButton(
                                onPressed: () => _removePhoto(index),
                                constraints: const BoxConstraints.tightFor(
                                  width: 28,
                                  height: 28,
                                ),
                                padding: EdgeInsets.zero,
                                style: IconButton.styleFrom(
                                  backgroundColor: AppColors.white,
                                  foregroundColor: Colors.red,
                                ),
                                icon: const Icon(Icons.close, size: 17),
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                  ),
                ],
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    '${photos.length} of 4-6 photos selected',
                    style: AppTextStyles.subtitle3.copyWith(
                      color: photos.length >= 4
                          ? AppColors.textSecondary
                          : AppColors.red,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          FormCard(
            title: 'Description',
            subtitle: 'Add notes and additional features',
            icon: Icons.notes_outlined,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AppTextField(
                  hint: 'Condition, history, standout features...',
                  label: "Notes",
                  controller: _notesController,
                  maxLines: 4,
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          FormCard(
            title: 'Public Catalog',
            subtitle: 'Visibility settings for customers',
            icon: Icons.public,
            child: Material(
              child: SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text(
                  'Show in public catalog',
                  style: AppTextStyles.subtitle3,
                ),
                value: _isPublicCatalog,
                onChanged: (value) => setState(() => _isPublicCatalog = value),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
