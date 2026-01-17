<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Institution;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class InstitutionController extends Controller
{
    /**
     * Display a listing of institutions.
     */
    public function index(Request $request)
    {
        $query = Institution::query();

        // Filter by type if provided
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        // Filter by active status
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $institutions = $query->orderBy('name')->get();

        return response()->json($institutions);
    }

    /**
     * Store a newly created institution.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'type' => 'required|in:mobile_money,bank',
            'code' => 'required|string|max:255|unique:institutions,code',
            'logo_url' => 'nullable|string|max:500',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors(),
            ], 422);
        }

        $institution = Institution::create($request->all());

        return response()->json($institution, 201);
    }

    /**
     * Display the specified institution.
     */
    public function show(Institution $institution)
    {
        return response()->json($institution);
    }

    /**
     * Update the specified institution.
     */
    public function update(Request $request, Institution $institution)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'type' => 'sometimes|required|in:mobile_money,bank',
            'code' => 'sometimes|required|string|max:255|unique:institutions,code,' . $institution->id,
            'logo_url' => 'nullable|string|max:500',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors(),
            ], 422);
        }

        $institution->update($request->all());

        return response()->json($institution);
    }

    /**
     * Remove the specified institution.
     */
    public function destroy(Institution $institution)
    {
        $institution->delete();

        return response()->json([
            'success' => true,
            'message' => 'Institution supprimée avec succès',
        ]);
    }

    /**
     * Get only active institutions.
     */
    public function active()
    {
        $institutions = Institution::active()->orderBy('name')->get();
        return response()->json($institutions);
    }
}
