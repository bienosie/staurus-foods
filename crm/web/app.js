import { Api, validateConfig } from "./api.js";
const $ = (id) => document.getElementById(id);
const stages = [
  "new",
  "validated",
  "specification_requested",
  "sample_discussion",
  "sample_sent",
  "quote_issued",
  "negotiation",
  "won",
  "lost",
];
const products = [
  "Dried hibiscus flowers",
  "Sesame seeds",
  "Soya beans",
  "Raw cashew nuts",
  "Cocoa beans",
  "Other dry agricultural commodity",
];
const terms = [
  "EXW",
  "FCA",
  "FOB",
  "CFR",
  "CIF",
  "CPT",
  "CIP",
  "DAP",
  "DPU",
  "DDP",
];
const label = (value) =>
  value.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
const date = (value) =>
  value ? new Date(value).toLocaleString("en-GB") : "Not scheduled";
const el = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
};
const options = (node, values) =>
  values.forEach((value) => {
    const option = el("option", label(value));
    option.value = value;
    node.append(option);
  });
options($("filter-status"), stages);
options($("progress-status"), stages);
options($("create-commodity"), products);
options($("quote-incoterm"), terms);
const config = window.SF_CRM_CONFIG;
const api = validateConfig(config) ? new Api(config) : null;
let role = null,
  rows = [],
  selected = null,
  displayed = [],
  page = 0,
  detailGeneration = 0,
  sessionGeneration = 0,
  expiryTimer,
  requestId = null;
const editor = () => ["editor", "admin"].includes(role);
const notify = (message) => {
  $("notice").textContent = message;
};
function permissions() {
  document
    .querySelectorAll("[data-editor]")
    .forEach((node) => (node.hidden = !editor()));
}
function reset() {
  sessionGeneration++;
  detailGeneration++;
  api?.clear();
  clearTimeout(expiryTimer);
  role = null;
  rows = [];
  selected = null;
  displayed = [];
  $("workspace").hidden = true;
  $("login-panel").hidden = false;
  $("logout").hidden = true;
  $("detail").hidden = true;
  $("enquiry-rows").replaceChildren();
  for (const id of ["samples", "quotes", "activities"]) $(id).replaceChildren();
  $("create-dialog").close();
  $("create-form").reset();
  $("role-label").textContent = "Private workspace";
  for (const id of [
    "detail-title",
    "detail-meta",
    "detail-spec",
    "metric-open",
    "metric-due",
    "metric-won",
    "load-summary",
  ])
    $(id).textContent = "";
  for (const id of [
    "progress-form",
    "sample-form",
    "quote-form",
    "verification-form",
  ])
    $(id).reset();
}
async function run(button, task) {
  if (button) button.disabled = true;
  try {
    await task();
  } catch (error) {
    notify(error.message);
    if (api && !api.token && role) reset();
  } finally {
    if (button) button.disabled = false;
  }
}
if (!api) {
  notify(
    "Setup pending: this CRM is not connected to a database. Configure the separate CRM deployment before signing in.",
  );
  $("login-form").querySelector("button").disabled = true;
}
$("login-form").addEventListener("submit", (event) => {
  event.preventDefault();
  run(event.submitter, async () => {
    const data = new FormData(event.target);
    role = await api.login(data.get("email"), data.get("password"));
    event.target.reset();
    $("role-label").textContent = `Staff · ${label(role)}`;
    $("logout").hidden = false;
    $("login-panel").hidden = true;
    $("workspace").hidden = false;
    permissions();
    notify("Signed in. Remember to sign out when finished.");
    expiryTimer = setTimeout(
      () => {
        reset();
        notify("Session ended. Sign in again to continue.");
      },
      50 * 60 * 1000,
    );
    await load();
  });
});
$("logout").addEventListener("click", () =>
  run($("logout"), async () => {
    try {
      await api.request("/auth/v1/logout", { method: "POST" });
    } finally {
      reset();
      notify("Signed out.");
    }
  }),
);
const due = (row) =>
  row.next_action_at &&
  new Date(row.next_action_at) <= new Date() &&
  !["won", "lost"].includes(row.status);
async function load(append = false) {
  const generation = sessionGeneration;
  const offset = append ? page * 100 : 0;
  const data = await api.request(
    `/rest/v1/sf_enquiries?select=*,sf_contacts(name,business_email,sf_organisations(id,legal_name,country,verification_status))&order=created_at.desc,id.desc&limit=100&offset=${offset}`,
  );
  if (generation !== sessionGeneration) return;
  rows = append ? [...rows, ...data] : data;
  page = append ? page + 1 : 1;
  $("load-more").hidden = data.length < 100;
  $("detail").hidden = true;
  selected = null;
  detailGeneration++;
  render();
}
function render() {
  $("metric-open").textContent = rows.filter(
    (r) => !["won", "lost"].includes(r.status),
  ).length;
  $("metric-due").textContent = rows.filter(due).length;
  $("metric-won").textContent = rows.filter((r) => r.status === "won").length;
  const term = $("search").value.toLowerCase();
  displayed = rows.filter((row) => {
    const contact = row.sf_contacts;
    return (
      (!term ||
        [
          contact?.name,
          contact?.business_email,
          contact?.sf_organisations?.legal_name,
          row.commodity,
        ]
          .join(" ")
          .toLowerCase()
          .includes(term)) &&
      (!$("filter-status").value || row.status === $("filter-status").value) &&
      (!$("due-only").checked || due(row))
    );
  });
  $("load-summary").textContent =
    `${displayed.length} shown from ${rows.length} loaded enquiries. Counts cover loaded records only.`;
  $("enquiry-rows").replaceChildren();
  $("empty").hidden = displayed.length > 0;
  $("empty").textContent = rows.length
    ? "No enquiries match these filters."
    : "No enquiries yet. Record a genuine buyer enquiry to begin.";
  displayed.forEach((row) => {
    const tr = el("tr");
    const contact = row.sf_contacts;
    const buyer = el(
      "td",
      contact?.sf_organisations?.legal_name || "Company unavailable",
    );
    buyer.append(el("small", contact?.name || ""));
    const product = el("td", row.commodity);
    product.append(el("small", `${row.quantity} · ${row.destination}`));
    const status = el("td");
    status.append(el("span", label(row.status), "badge"));
    const next = el("td", date(row.next_action_at), due(row) ? "overdue" : "");
    const actions = el("td");
    const button = el("button", "Open", "secondary");
    button.addEventListener("click", () => run(button, () => open(row)));
    actions.append(button);
    tr.append(buyer, product, status, next, actions);
    $("enquiry-rows").append(tr);
  });
  permissions();
}
async function open(row) {
  const generation = ++detailGeneration;
  selected = null;
  $("detail").hidden = true;
  const [activities, samples, quotes] = await Promise.all(
    ["sf_activities", "sf_samples", "sf_quotes"].map((table) =>
      api.request(
        `/rest/v1/${table}?enquiry_id=eq.${row.id}&order=created_at.desc&limit=1000`,
      ),
    ),
  );
  if (generation !== detailGeneration) return;
  selected = row;
  const org = row.sf_contacts.sf_organisations;
  $("detail-title").textContent = org.legal_name;
  $("detail-meta").textContent =
    `${row.sf_contacts.name} · ${row.sf_contacts.business_email} · ${row.commodity} · ${row.quantity} · ${row.destination}`;
  $("detail-spec").textContent = row.specification;
  const form = $("progress-form");
  form.elements.status.value = row.status;
  form.elements.notes.value = "";
  form.elements.next_action_at.value = row.next_action_at
    ? localDate(row.next_action_at)
    : "";
  $("verification-form").elements.verification.value = org.verification_status;
  $("activities").replaceChildren(
    ...activities.map((a) =>
      el("li", `${date(a.created_at)} · ${label(a.action_type)}\n${a.notes}`),
    ),
  );
  renderRecords(
    "samples",
    samples,
    "sf_samples",
    ["pending", "accepted", "rejected", "inconclusive"],
    "result",
    (s) =>
      `${s.lot_id} · ${s.cost} ${s.currency}\nDispatch: ${s.dispatch_date || "Not dispatched"}\nTracking: ${s.tracking_reference || "Not provided"}`,
  );
  renderRecords(
    "quotes",
    quotes,
    "sf_quotes",
    ["draft", "issued", "accepted", "declined", "expired"],
    "status",
    (q) =>
      `${q.quote_reference} · ${q.price} ${q.currency} / ${q.price_basis}\n${q.incoterm} ${q.named_place} · Valid until ${q.valid_until}`,
  );
  $("detail").hidden = false;
  permissions();
  $("detail").scrollIntoView({ behavior: "smooth", block: "start" });
}
function localDate(value) {
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
function renderRecords(id, items, table, states, field, describe) {
  const root = $(id);
  root.replaceChildren();
  if (!items.length) root.append(el("p", "Nothing recorded yet.", "small"));
  items.forEach((item) => {
    const card = el("div", undefined, "record");
    card.append(el("p", describe(item), "prewrap"));
    const current = el("p", label(item[field]));
    card.append(current);
    if (editor()) {
      const select = el("select");
      select.setAttribute(
        "aria-label",
        `${id === "samples" ? "Sample result" : "Quote status"} for ${item.lot_id || item.quote_reference}`,
      );
      options(select, states);
      select.value = item[field];
      const button = el("button", "Save status", "secondary");
      button.addEventListener("click", () =>
        run(button, async () => {
          await api.update(table, item.id, { [field]: select.value });
          item[field] = select.value;
          current.textContent = label(select.value);
          notify("Status saved.");
        }),
      );
      card.append(select, button);
    }
    root.append(card);
  });
}
for (const id of ["search", "filter-status", "due-only"])
  $(id).addEventListener("input", render);
$("refresh").addEventListener("click", () => run($("refresh"), () => load()));
$("load-more").addEventListener("click", () =>
  run($("load-more"), () => load(true)),
);
$("close-detail").addEventListener("click", () => {
  detailGeneration++;
  selected = null;
  $("detail").hidden = true;
});
$("new-enquiry").addEventListener("click", () => {
  requestId = crypto.randomUUID();
  $("create-form").reset();
  $("create-error").textContent = "";
  $("create-dialog").showModal();
});
$("close-create").addEventListener("click", () => $("create-dialog").close());
$("create-form").addEventListener("input", () => {
  requestId = crypto.randomUUID();
});
$("create-form").addEventListener("submit", (event) => {
  event.preventDefault();
  run(event.submitter, async () => {
    try {
      const body = Object.fromEntries(new FormData(event.target));
      body.source = "manual";
      await api.rpc("sf_create_enquiry", {
        p_request_id: requestId,
        p_payload: body,
      });
      $("create-dialog").close();
      await load();
      notify("Buyer enquiry recorded.");
    } catch (error) {
      $("create-error").textContent = error.message;
      throw error;
    }
  });
});
$("progress-form").addEventListener("submit", (event) => {
  event.preventDefault();
  run(event.submitter, async () => {
    if (!selected) return;
    const id = selected.id;
    const data = new FormData(event.target);
    await api.rpc("sf_progress_enquiry", {
      p_id: id,
      p_version: selected.version,
      p_status: data.get("status"),
      p_notes: data.get("notes"),
      p_next_action_at: data.get("next_action_at")
        ? new Date(data.get("next_action_at")).toISOString()
        : null,
    });
    await load();
    const row = rows.find((r) => r.id === id);
    if (row) await open(row);
    notify("Action and follow-up saved.");
  });
});
$("verification-form").addEventListener("submit", (event) => {
  event.preventDefault();
  run(event.submitter, async () => {
    if (!selected) return;
    const org = selected.sf_contacts.sf_organisations;
    const status = new FormData(event.target).get("verification");
    await api.update("sf_organisations", org.id, {
      verification_status: status,
    });
    org.verification_status = status;
    notify("Verification status saved.");
  });
});
for (const kind of ["sample", "quote"])
  $(`${kind}-form`).addEventListener("submit", (event) => {
    event.preventDefault();
    run(event.submitter, async () => {
      if (!selected) return;
      const row = selected;
      const payload = Object.fromEntries(new FormData(event.target));
      payload.enquiry_id = row.id;
      if (kind === "sample" && !payload.dispatch_date)
        payload.dispatch_date = null;
      await api.insert(kind === "sample" ? "sf_samples" : "sf_quotes", payload);
      event.target.reset();
      await open(row);
      notify(`${label(kind)} recorded.`);
    });
  });
$("export").addEventListener("click", () => {
  const blob = new Blob(
    [
      JSON.stringify(
        {
          exported_at: new Date().toISOString(),
          scope:
            "Displayed enquiries only; excludes samples, quotes and activity history",
          enquiries: displayed,
        },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const a = el("a");
  a.href = url;
  a.download = `staurus-buyer-enquiries-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify(
    "Displayed enquiries exported. Handle this file as confidential buyer data.",
  );
});
