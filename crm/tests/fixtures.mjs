// Synthetic fixtures for isolated UI checks only. Never included in web/ or site/.
export const id = "00000000-0000-4000-8000-000000000099";
export const fixture = {
  id,
  commodity: "Dried hibiscus flowers",
  quantity: "1 test unit",
  destination: "Test destination",
  specification:
    "Synthetic requirement for interface checks only. <img src=x onerror=alert(1)>",
  status: "new",
  version: 1,
  created_at: "2026-11-16T09:00:00Z",
  next_action_at: "2020-01-01T12:00:00Z",
  sf_contacts: {
    name: "Synthetic contact",
    business_email: "fixture@example.invalid",
    sf_organisations: {
      id: "00000000-0000-4000-8000-000000000088",
      legal_name: "TEST FIXTURE, NOT A BUYER",
      country: "Test country",
      verification_status: "unverified",
    },
  },
};
export function installFixture(target) {
  target.SF_CRM_CONFIG = {
    url: "https://isolated.supabase.co",
    publishableKey: "sb_publishable_fixture_only",
  };
  target.fetch = async (url, options = {}) => {
    let result = [];
    if (url.includes("/token?"))
      result = { access_token: "synthetic-test-token" };
    else if (url.includes("/logout"))
      return new Response(null, { status: 204 });
    else if (url.includes("/rpc/sf_access_role")) result = "editor";
    else if (url.includes("/sf_enquiries?")) result = [fixture];
    else if (url.includes("/sf_activities?"))
      result = [
        {
          created_at: fixture.created_at,
          action_type: "enquiry_received",
          notes: "SYNTHETIC TEST ONLY. No buyer enquiry was received.",
        },
      ];
    else if (url.includes("/rpc/sf_create_enquiry")) result = id;
    else if (url.includes("/rpc/sf_progress_enquiry")) {
      const p = JSON.parse(options.body);
      fixture.status = p.p_status;
      fixture.version++;
      fixture.next_action_at = p.p_next_action_at;
      result = null;
    } else if (options.method === "PATCH" || options.method === "POST")
      result = [{ id, ...JSON.parse(options.body) }];
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}
