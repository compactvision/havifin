<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\News;
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
            'content' => 'required|string',
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

        $news = News::create($data);

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
        $validator = Validator::make($request->all(), [
            'content' => 'sometimes|required|string',
            'display_order' => 'nullable|integer',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors(),
            ], 422);
        }

        $news->update($request->all());

        return response()->json($news);
    }

    /**
     * Remove the specified news.
     */
    public function destroy(News $news)
    {
        $news->delete();

        return response()->json([
            'success' => true,
            'message' => 'L\'information a été supprimée avec succès',
        ]);
    }
}
