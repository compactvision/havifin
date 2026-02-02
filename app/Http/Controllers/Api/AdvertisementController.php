<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Advertisement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AdvertisementController extends Controller
{
    /**
     * Get all advertisements.
     */
    public function index()
    {
        $advertisements = Advertisement::ordered()->get();
        return response()->json($advertisements);
    }

    /**
     * Get only active advertisements for display.
     */
    public function active()
    {
        $advertisements = Advertisement::active()->ordered()->get();
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
            'image_url' => 'required|string', // Removed max to support Data URLs
            'display_order' => 'nullable|integer',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors(),
            ], 422);
        }

        $data = $request->all();
        
        // Assign owner_id
        $creator = $request->user();
        $data['owner_id'] = $creator->role === 'super-admin' ? $creator->id : $creator->owner_id;

        $advertisement = Advertisement::create($data);

        \App\Models\CashierActivity::logAction('complete_transaction', "Publicité créée: {$advertisement->title}");

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
        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'type' => 'sometimes|required|in:image,video',
            'image_url' => 'sometimes|required|string', // Removed max to support Data URLs
            'display_order' => 'nullable|integer',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors(),
            ], 422);
        }

        $advertisement->update($request->all());

        \App\Models\CashierActivity::logAction('complete_transaction', "Publicité mise à jour: {$advertisement->title}");

        return response()->json($advertisement);
    }

    /**
     * Remove the specified advertisement.
     */
    public function destroy(Advertisement $advertisement)
    {
        $advertisement->delete();

        \App\Models\CashierActivity::logAction('complete_transaction', "Publicité supprimée: {$advertisement->title}");

        return response()->json([
            'success' => true,
            'message' => 'Publicité supprimée avec succès',
        ]);
    }
}
