<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Advertisement;
use App\Models\CashierActivity;
use App\Support\TenantAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class AdvertisementController extends Controller
{
    /**
     * Get all advertisements.
     */
    public function index(Request $request)
    {
        $advertisements = Advertisement::forShop($request->integer('shop_id'))->ordered()->get();

        return response()->json($advertisements);
    }

    /**
     * Get only active advertisements for display.
     */
    public function active(Request $request)
    {
        $advertisements = Advertisement::active()->forShop($request->integer('shop_id'))->ordered()->get();

        return response()->json($advertisements);
    }

    /**
     * Store a new advertisement.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'type' => 'required|in:image,video',
            'image_url' => 'required_without:media|nullable|string|max:7000000',
            'media' => 'required_without:image_url|nullable|file|mimetypes:video/mp4,video/webm,video/ogg,video/quicktime,image/jpeg,image/png,image/gif,image/webp|max:20480',
            'display_order' => 'nullable|integer',
            'is_active' => 'boolean',
            'shop_id' => 'nullable|integer|exists:shops,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        if ($request->hasFile('media')) {
            $path = $request->file('media')->store('advertisements', 'public');
            $data['image_url'] = '/storage/'.$path;
        }
        unset($data['media']);

        // Assign owner_id
        $creator = $request->user();
        $data['owner_id'] = $creator->role === 'super-admin' ? $creator->id : $creator->owner_id;

        // A null shop_id keeps the ad owner-wide; a set one must be a shop the
        // creator actually manages.
        if (! empty($data['shop_id'])) {
            TenantAccess::authorizeShop($creator, (int) $data['shop_id']);
        }

        $advertisement = Advertisement::create($data);

        CashierActivity::logAction('configuration_change', "Publicité créée: {$advertisement->title}");

        return response()->json($advertisement, 201);
    }

    /**
     * Display the specified advertisement.
     */
    public function show(Advertisement $advertisement)
    {
        return response()->json($advertisement);
    }

    /**
     * Update the specified advertisement.
     */
    public function update(Request $request, Advertisement $advertisement)
    {
        TenantAccess::authorizeOwner($request->user(), $advertisement);
        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'type' => 'sometimes|required|in:image,video',
            'image_url' => 'sometimes|nullable|string|max:7000000',
            'media' => 'nullable|file|mimetypes:video/mp4,video/webm,video/ogg,video/quicktime,image/jpeg,image/png,image/gif,image/webp|max:20480',
            'display_order' => 'nullable|integer',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        if ($request->hasFile('media')) {
            if (str_starts_with((string) $advertisement->image_url, '/storage/')) {
                Storage::disk('public')->delete(str_replace('/storage/', '', $advertisement->image_url));
            }

            $path = $request->file('media')->store('advertisements', 'public');
            $data['image_url'] = '/storage/'.$path;
        }
        unset($data['media']);

        $advertisement->update($data);

        CashierActivity::logAction('configuration_change', "Publicité mise à jour: {$advertisement->title}");

        return response()->json($advertisement);
    }

    /**
     * Remove the specified advertisement.
     */
    public function destroy(Request $request, Advertisement $advertisement)
    {
        TenantAccess::authorizeOwner($request->user(), $advertisement);
        $advertisement->delete();

        CashierActivity::logAction('configuration_change', "Publicité supprimée: {$advertisement->title}");

        return response()->json([
            'success' => true,
            'message' => 'Publicité supprimée avec succès',
        ]);
    }
}
