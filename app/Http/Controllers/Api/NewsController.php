<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashierActivity;
use App\Models\News;
use App\Support\TenantAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class NewsController extends Controller
{
    /**
     * Get all news.
     */
    public function index()
    {
        $news = News::ordered()->get();

        return response()->json($news);
    }

    /**
     * Get only active news for display.
     */
    public function active()
    {
        $news = News::active()->ordered()->get();

        return response()->json($news);
    }

    /**
     * Store a new news item.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'content' => 'required|string|max:2000',
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

        // Assign owner_id
        $creator = $request->user();
        $data['owner_id'] = $creator->role === 'super-admin' ? $creator->id : $creator->owner_id;

        $news = News::create($data);
        CashierActivity::logAction('configuration_change', "Message d'écran créé: {$news->id}");

        return response()->json($news, 201);
    }

    /**
     * Display the specified news.
     */
    public function show(News $news)
    {
        return response()->json($news);
    }

    /**
     * Update the specified news.
     */
    public function update(Request $request, News $news)
    {
        TenantAccess::authorizeOwner($request->user(), $news);
        $validator = Validator::make($request->all(), [
            'content' => 'sometimes|required|string|max:2000',
            'display_order' => 'nullable|integer',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors(),
            ], 422);
        }

        $news->update($validator->validated());
        CashierActivity::logAction('configuration_change', "Message d'écran mis à jour: {$news->id}");

        return response()->json($news);
    }

    /**
     * Remove the specified news.
     */
    public function destroy(Request $request, News $news)
    {
        TenantAccess::authorizeOwner($request->user(), $news);
        $news->delete();
        CashierActivity::logAction('configuration_change', "Message d'écran supprimé: {$news->id}");

        return response()->json([
            'success' => true,
            'message' => 'L\'information a été supprimée avec succès',
        ]);
    }
}
