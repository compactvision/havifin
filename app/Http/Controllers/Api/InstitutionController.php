<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashierActivity;
use App\Models\CashSessionInstitutionBalance;
use App\Models\Institution;
use App\Support\TenantAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

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
    /**
     * Store a newly created institution.
     */
    public function store(Request $request)
    {
        $creator = $request->user();

        if (! $creator) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        $ownerId = $creator->role === 'super-admin' ? $creator->id : $creator->owner_id;

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'type' => 'required|in:mobile_money,bank,payment,other',
            'code' => ['required', 'string', 'max:255', Rule::unique('institutions', 'code')->where('owner_id', $ownerId)],
            'logo' => 'nullable|image|max:2048', // Allow image upload
            'is_active' => 'boolean',
            'settings' => 'nullable|array',
            'low_balance_threshold' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors(),
            ], 422);
        }

        $data = $request->except('logo');

        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('institutions', 'public');
            $data['logo_url'] = '/storage/'.$path;
        }

        $data['owner_id'] = $ownerId;

        $institution = Institution::create($data);

        CashierActivity::logAction('configuration_change', "Partenaire créé: {$institution->name} ({$institution->type})");

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
        TenantAccess::authorizeOwner($request->user(), $institution);
        // For multipart/form-data requests in Laravel (PUT/PATCH), we often use POST with _method field.
        // We need to parse boolean properly from string if coming from FormData.
        $logoValidation = $request->hasFile('logo') ? 'sometimes|image|max:2048' : 'nullable';

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'type' => 'sometimes|required|in:mobile_money,bank,payment,other',
            'code' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('institutions', 'code')->where('owner_id', $institution->owner_id)->ignore($institution->id)],
            'logo' => $logoValidation,
            'is_active' => 'sometimes', // Can be boolean or "1"/"0" string from FormData
            'settings' => 'sometimes|nullable|array',
            'low_balance_threshold' => 'sometimes|nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors(),
            ], 422);
        }

        $data = $request->except(['logo', '_method']);

        // Handle boolean conversion for FormData
        if ($request->has('is_active')) {
            $data['is_active'] = filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN);
        }

        if ($request->hasFile('logo')) {
            // Delete old logo if exists
            if ($institution->logo_url) {
                $oldPath = str_replace('/storage/', '', $institution->logo_url);
                Storage::disk('public')->delete($oldPath);
            }

            $path = $request->file('logo')->store('institutions', 'public');
            $data['logo_url'] = '/storage/'.$path;
        }

        $institution->update($data);

        CashierActivity::logAction('configuration_change', "Partenaire mis à jour: {$institution->name}");

        return response()->json($institution);
    }

    /**
     * Remove the specified institution.
     */
    public function destroy(Request $request, Institution $institution)
    {
        TenantAccess::authorizeOwner($request->user(), $institution);
        $institution->delete();

        CashierActivity::logAction('configuration_change', "Partenaire supprimé: {$institution->name}");

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

    /**
     * Every operator float, in every currently open till, that has dropped
     * below its configured floor - the live counterpart to the
     * low_balance_alert entries CashService writes to the activity log,
     * for a manager/super-admin dashboard banner.
     */
    public function lowBalanceAlerts(Request $request)
    {
        $shopIds = TenantAccess::shopIds($request->user());

        $alerts = CashSessionInstitutionBalance::query()
            ->with([
                'institution:id,name,type,low_balance_threshold',
                'session.register.shop:id,name',
                'session.user:id,name',
            ])
            ->whereHas('session', fn ($query) => $query
                ->where('status', 'open')
                ->whereHas('register', fn ($registerQuery) => $registerQuery->whereIn('shop_id', $shopIds)))
            ->whereHas('institution', fn ($query) => $query->whereNotNull('low_balance_threshold'))
            ->get()
            ->filter(fn ($balance) => (float) $balance->current_theoretical < (float) $balance->institution->low_balance_threshold)
            ->map(fn ($balance) => [
                'id' => $balance->id,
                'institution' => $balance->institution->name,
                'currency' => $balance->currency,
                'current_theoretical' => (float) $balance->current_theoretical,
                'threshold' => (float) $balance->institution->low_balance_threshold,
                'shop' => $balance->session->register->shop->name ?? null,
                'cashier' => $balance->session->user->name ?? null,
                'cash_session_id' => $balance->cash_session_id,
            ])
            ->values();

        return response()->json($alerts);
    }
}
