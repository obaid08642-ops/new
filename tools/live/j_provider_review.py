"""Journey: an admin asks a provider for changes and the provider sees why (provider-journeys#24).
  admin provider-moderation "request changes" (POST /admin/providers/:id/request-changes {note}) -> the provider app's
  status screen (PendingDashboard) reads GET /provider-onboarding/progress, which now carries the reviewer's note.
"""
from lib import Client, journey, step


def run():
    import j_admin, j_onboarding
    admin, _ = j_admin.login()
    p = j_onboarding.register_type('doctor', {'consultation_modes': ['clinic']})
    journey('provider review: the admin asks for changes with a written reason')
    r = admin.get('/admin/admin/providers?status=pending&limit=100')
    items = r.body.get('items', []) if isinstance(r.body, dict) else []
    mine = next((i for i in items if i.get('email') == p['email']), None)
    step('the new doctor is in the pending list', r.ok and mine, r)
    if not mine:
        return
    note = 'صورة الرخصة غير واضحة، أعد رفعها من فضلك'
    r = admin.post(f"/admin/admin/providers/{mine['id']}/request-changes", {'note': note})
    step('admin requests changes with a note', r.ok, r)
    journey('provider review: the provider status screen shows the reason')
    r = Client(p['token'], 'doctor').get('/provider-onboarding/progress')
    step('progress says changes are needed', r.ok and r.get('review_status') == 'needs_changes', r)
    step("progress carries the reviewer's note", r.get('review_note') == note, r.get('review_note'))


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
