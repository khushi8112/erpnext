frappe.provide("erpnext.utils");

// Frappe discovers this class by convention: doctype name (no spaces) + "QuickEntryForm".
// It is instantiated automatically when frappe.ui.form.make_quick_entry("Address", ...) is called.
frappe.ui.form.AddressQuickEntryForm = class AddressQuickEntryForm extends frappe.ui.form.QuickEntryForm {
	render_dialog() {
		this.mandatory = this._get_address_fields();
		super.render_dialog();
	}

	_get_address_fields() {
		const field = (name) => frappe.meta.get_docfield("Address", name);
		return [
			field("address_title"),
			field("address_type"),
			field("address_line1"),
			field("address_line2"),
			{ fieldtype: "Column Break" },
			field("city"),
			field("state"),
			field("pincode"),
			field("country"),
			{ fieldtype: "Section Break" },
			field("is_primary_address"),
			field("is_shipping_address"),
		].filter(Boolean);
	}

	update_doc() {
		const doc = super.update_doc();
		if (!doc.links?.length && frappe.dynamic_link) {
			const link = frappe.model.add_child(doc, "Dynamic Link", "links");
			link.link_doctype = frappe.dynamic_link.doctype;
			link.link_name = frappe.dynamic_link.doc[frappe.dynamic_link.fieldname];
		}
		return doc;
	}
};

frappe.ui.form.ContactQuickEntryForm = class ContactQuickEntryForm extends frappe.ui.form.QuickEntryForm {
	set_meta_and_mandatory_fields() {
		this.meta = frappe.get_meta(this.doctype);
		const field = (name) => {
			const df = frappe.meta.get_docfield("Contact", name);
			if (!df) return null;
			return Object.assign({}, df, { read_only: 0 });
		};
		this.docfields = [
			field("first_name"),
			field("last_name"),
			field("email_id"),
			field("mobile_no"),
			field("is_primary_contact"),
		].filter(Boolean);
	}

	update_doc() {
		const doc = super.update_doc();
		if (!doc.links?.length && frappe.dynamic_link) {
			const link = frappe.model.add_child(doc, "Dynamic Link", "links");
			link.link_doctype = frappe.dynamic_link.doctype;
			link.link_name = frappe.dynamic_link.doc[frappe.dynamic_link.fieldname];
		}
		return doc;
	}
};

const ADDRESS_LIST_TEMPLATE = `
<p>
	<button class="btn btn-xs btn-default btn-address">{{ __("New Address") }}</button>
</p>
<div class="clearfix"></div>
{% for (const addr of addr_list) { %}
	<div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:var(--border-radius);padding:12px 14px;margin-bottom:10px">
		<div class="flex justify-between align-items-start mb-1">
			<div>
			<strong>{%= addr.address_title %}</strong>
			{% if (addr.is_primary_address) { %}
				<span class="indicator-pill blue no-indicator-dot">{%= __("Primary") %}</span>
			{% } %}
			</div>
			<div class="flex align-items-center" style="gap:6px">
				<a
					href="{%= frappe.utils.get_form_link('Address', addr.name) %}"
					class="text-muted"
					title="{%= __('Edit') %}"
				><svg class="icon icon-xs"><use href="#icon-edit"></use></svg></a>
			</div>
		</div>
		<p class="text-muted small mb-1">
			{%= addr.address_type !== "Other" ? __(addr.address_type) : "" %}
			{% if (addr.is_shipping_address) { %}&nbsp;&#183; {%= __("Shipping") %}{% } %}
			{% if (addr.disabled) { %}&nbsp;&#183; {%= __("Disabled") %}{% } %}
		</p>
		<p class="text-muted small mb-0">{%= [addr.address_line1, addr.address_line2].filter(Boolean).join(", ") %}</p>
		<p class="text-muted small mb-0">{%= [addr.city, addr.state, addr.pincode, addr.country].filter(Boolean).join(", ") %}</p>
		{% if (!addr.is_primary_address) { %}
			<div class="mt-3 pt-2" style="border-top:1px solid var(--border-color)">
				<button class="btn btn-xs btn-default btn-set-primary" data-address="{%= addr.name %}">{%= __("Set as Primary") %}</button>
			</div>
		{% } %}
	</div>
{% } %}
{% if (!addr_list.length) { %}
	<p class="text-muted small">{%= __("No address added yet.") %}</p>
{% } %}
`;

erpnext.utils.bind_contact_quick_entry = function (frm) {
	const wrapper = $(frm.fields_dict.contact_html?.wrapper);
	if (!wrapper.length) return;

	if (frm.doc.__onload && "contact_list" in frm.doc.__onload) {
		$(wrapper).html(frappe.render_template("contact_list", frm.doc.__onload));
		$(wrapper)
			.find(".btn-contact")
			.on("click", () => {
				frappe.dynamic_link = { doctype: frm.doc.doctype, doc: frm.doc, fieldname: "name" };
				frappe.ui.form.make_quick_entry("Contact", () => frm.reload_doc());
			});
	}
};

erpnext.utils.bind_address_quick_entry = function (frm, options = {}) {
	const wrapper = $(frm.fields_dict.address_html?.wrapper);
	if (!wrapper.length) return;

	const addr_list = frm.doc.__onload?.addr_list || [];
	wrapper.html(frappe.render_template(ADDRESS_LIST_TEMPLATE, { addr_list }));

	wrapper.off("click.addr_quick");

	wrapper.on("click.addr_quick", ".btn-address", () => {
		frappe.dynamic_link = { doctype: frm.doc.doctype, doc: frm.doc, fieldname: "name" };
		frappe.ui.form.make_quick_entry("Address", async (doc) => {
			await options.after_insert?.(doc);
			frm.reload_doc();
		});
	});

	wrapper.on("click.addr_quick", ".btn-set-primary", async function () {
		const addr_name = $(this).data("address");
		await frappe.db.set_value("Address", addr_name, "is_primary_address", 1);
		await options.on_set_primary?.(addr_name);
		frappe.show_alert({ message: __("Set as primary address"), indicator: "blue" });
		frm.reload_doc();
	});
};
