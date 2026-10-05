import { SchemaModel, Table, Relationship, Column } from '../types/schema';

export interface GeneratedDomainSolution {
  explanation: string;
  summary: string;
  updatedSchema: SchemaModel;
  sqlPreview?: string;
}

export function generateDomainSchemaSolution(
  prompt: string,
  currentSchema: SchemaModel
): GeneratedDomainSolution {
  const lower = prompt.toLowerCase();
  const dialect = currentSchema.dialect || 'postgres';

  const pkType = dialect === 'mssql' ? 'uniqueidentifier' : dialect === 'postgres' ? 'uuid' : 'int';
  const pkDefault = dialect === 'mssql' ? 'NEWID()' : dialect === 'postgres' ? 'gen_random_uuid()' : undefined;
  const fkType = pkType;
  const textType = dialect === 'mssql' ? 'nvarchar(255)' : 'varchar(255)';
  const shortText = dialect === 'mssql' ? 'nvarchar(100)' : 'varchar(100)';
  const descType = dialect === 'mssql' ? 'nvarchar(max)' : 'text';
  const timestampType = dialect === 'mssql' ? 'datetime2' : 'timestamptz';
  const decimalType = dialect === 'mssql' ? 'decimal(18,2)' : 'numeric(12,2)';
  const dateType = 'date';

  // Determine starting position on canvas (place to right or below existing tables if present)
  let startX = 60;
  let startY = 60;
  if (currentSchema.tables.length > 0) {
    const maxX = Math.max(...currentSchema.tables.map(t => t.position.x));
    const maxY = Math.max(...currentSchema.tables.map(t => t.position.y));
    // If canvas has tables, start adjacent to avoid overlapping
    startX = maxX > 600 ? 60 : maxX + 360;
    startY = maxX > 600 ? maxY + 320 : 60;
  }

  // Helper to build a column
  const makeCol = (
    name: string,
    type: string,
    isPk = false,
    isFk = false,
    isNullable = false,
    isUnique = false,
    refTable?: string,
    refCol = 'id'
  ): Column => ({
    id: `col_${name}_${Math.random().toString(36).substring(2, 7)}`,
    name,
    type: isPk ? pkType : type,
    isPrimaryKey: isPk,
    isForeignKey: isFk,
    isNullable,
    isUnique: isUnique || isPk,
    isIndexed: isPk || isFk,
    defaultValue: isPk ? pkDefault : undefined,
    references: isFk && refTable ? {
      targetTableId: refTable,
      targetColumnId: refCol,
    } : undefined,
  });

  // Helper to build a table
  const makeTable = (
    id: string,
    name: string,
    cols: Column[],
    colOffset: number,
    rowOffset: number,
    color: string
  ): Table => ({
    id,
    name,
    position: {
      x: Math.round(startX + colOffset * 340),
      y: Math.round(startY + rowOffset * 280),
    },
    colorHeader: color,
    columns: cols,
  });

  // Helper to wire relationship
  const makeRel = (
    srcTableId: string,
    srcColId: string,
    tgtTableId: string,
    tgtColId: string,
    name: string
  ): Relationship => ({
    id: `rel_${Math.random().toString(36).substring(2, 9)}`,
    sourceTableId: srcTableId,
    sourceColumnId: srcColId,
    targetTableId: tgtTableId,
    targetColumnId: tgtColId,
    cardinality: '1:N',
    sourceEnd: 'crows-foot',
    targetEnd: 'one',
    name,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  const existingTables = [...currentSchema.tables];
  const existingRels = [...currentSchema.relationships];

  // 1. ANIMAL CLINIC / VETERINARY
  if (/animal|clinic|veterinar|vet|pet|hospital/i.test(lower) && !/hotel|school|flight/i.test(lower)) {
    const tblOwnersId = `tbl_owners_${Date.now()}`;
    const tblPetsId = `tbl_patients_${Date.now() + 1}`;
    const tblVetsId = `tbl_vets_${Date.now() + 2}`;
    const tblApptsId = `tbl_appts_${Date.now() + 3}`;
    const tblRecordsId = `tbl_records_${Date.now() + 4}`;

    const ownersCols = [
      makeCol('id', pkType, true),
      makeCol('first_name', shortText),
      makeCol('last_name', shortText),
      makeCol('phone', shortText),
      makeCol('email', textType, false, false, true, true),
      makeCol('address', textType, false, false, true),
      makeCol('created_at', timestampType),
    ];

    const petsCols = [
      makeCol('id', pkType, true),
      makeCol('owner_id', fkType, false, true, false, false, tblOwnersId, ownersCols[0].id),
      makeCol('name', shortText),
      makeCol('species', shortText), // dog, cat, avian, etc.
      makeCol('breed', shortText, false, false, true),
      makeCol('birth_date', dateType, false, false, true),
      makeCol('microchip_number', shortText, false, false, true, true),
      makeCol('created_at', timestampType),
    ];

    const vetsCols = [
      makeCol('id', pkType, true),
      makeCol('full_name', shortText),
      makeCol('specialty', shortText), // surgery, dermatology, general
      makeCol('license_number', shortText, false, false, false, true),
      makeCol('phone', shortText),
      makeCol('email', textType, false, false, true, true),
      makeCol('is_active', 'boolean'),
    ];

    const apptsCols = [
      makeCol('id', pkType, true),
      makeCol('patient_id', fkType, false, true, false, false, tblPetsId, petsCols[0].id),
      makeCol('vet_id', fkType, false, true, false, false, tblVetsId, vetsCols[0].id),
      makeCol('scheduled_time', timestampType),
      makeCol('status', shortText), // scheduled, checked_in, completed, cancelled
      makeCol('reason_for_visit', textType),
      makeCol('created_at', timestampType),
    ];

    const recordsCols = [
      makeCol('id', pkType, true),
      makeCol('appointment_id', fkType, false, true, false, false, tblApptsId, apptsCols[0].id),
      makeCol('patient_id', fkType, false, true, false, false, tblPetsId, petsCols[0].id),
      makeCol('diagnosis', textType),
      makeCol('treatment_plan', descType),
      makeCol('medication_prescribed', textType, false, false, true),
      makeCol('total_cost', decimalType),
      makeCol('created_at', timestampType),
    ];

    const newTables: Table[] = [
      makeTable(tblOwnersId, 'pet_owners', ownersCols, 0, 0, '#3B82F6'),
      makeTable(tblPetsId, 'patients_pets', petsCols, 1, 0, '#06B6D4'),
      makeTable(tblVetsId, 'veterinarians', vetsCols, 0, 1, '#10B981'),
      makeTable(tblApptsId, 'appointments', apptsCols, 1, 1, '#8B5CF6'),
      makeTable(tblRecordsId, 'medical_treatments', recordsCols, 2, 1, '#EC4899'),
    ];

    const newRels: Relationship[] = [
      makeRel(tblPetsId, petsCols[1].id, tblOwnersId, ownersCols[0].id, 'fk_pets_owner'),
      makeRel(tblApptsId, apptsCols[1].id, tblPetsId, petsCols[0].id, 'fk_appts_patient'),
      makeRel(tblApptsId, apptsCols[2].id, tblVetsId, vetsCols[0].id, 'fk_appts_vet'),
      makeRel(tblRecordsId, recordsCols[1].id, tblApptsId, apptsCols[0].id, 'fk_records_appt'),
      makeRel(tblRecordsId, recordsCols[2].id, tblPetsId, petsCols[0].id, 'fk_records_patient'),
    ];

    const explanation = `### 🏥 Veterinary & Animal Clinic Architecture Implemented

I have engineered a complete, normalized (3NF) relational database architecture tailored specifically for a veterinary / animal clinic with **5 core entities** and **5 foreign key relationships**:

1. **\`pet_owners\`**: Stores primary client demographics, contact telephone numbers, and addresses.
2. **\`patients_pets\`**: Manages animal profiles (species, breed, birth date, microchip) linked to an owner (\`1:N\`).
3. **\`veterinarians\`**: Records clinical practitioners, specialty disciplines, and license credentials.
4. **\`appointments\`**: Junction entity scheduling consultations between specific patients and veterinarians.
5. **\`medical_treatments\`**: Comprehensive electronic health record capturing diagnoses, clinical procedures, medication regimens, and treatment costs.

**Engineering Highlights**:
- Foreign keys indexed with Crow's Foot connectors for optimal B-tree lookups.
- Normalized structure avoids data duplication across multiple pet visits.
- Referential integrity configured with \`CASCADE\` rules.`;

    return {
      explanation,
      summary: 'Animal Clinic Schema (5 tables, 5 relationships)',
      updatedSchema: {
        ...currentSchema,
        tables: [...existingTables, ...newTables],
        relationships: [...existingRels, ...newRels],
        updatedAt: Date.now(),
      },
      sqlPreview: `-- Veterinary Clinic Schema
CREATE TABLE pet_owners (id ${pkType} PRIMARY KEY, first_name ${shortText}, last_name ${shortText}, phone ${shortText});
CREATE TABLE patients_pets (id ${pkType} PRIMARY KEY, owner_id ${fkType} REFERENCES pet_owners(id), name ${shortText}, species ${shortText});
CREATE TABLE veterinarians (id ${pkType} PRIMARY KEY, full_name ${shortText}, specialty ${shortText});
CREATE TABLE appointments (id ${pkType} PRIMARY KEY, patient_id ${fkType} REFERENCES patients_pets(id), vet_id ${fkType} REFERENCES veterinarians(id));
CREATE TABLE medical_treatments (id ${pkType} PRIMARY KEY, appointment_id ${fkType} REFERENCES appointments(id), diagnosis ${textType}, total_cost ${decimalType});`,
    };
  }

  // 2. HOTEL / HOSPITALITY / BOOKING
  if (/hotel|booking|reservation|room|guest/i.test(lower)) {
    const tblGuests = `tbl_guests_${Date.now()}`;
    const tblRooms = `tbl_rooms_${Date.now() + 1}`;
    const tblBookings = `tbl_bookings_${Date.now() + 2}`;
    const tblPayments = `tbl_payments_${Date.now() + 3}`;

    const guestCols = [
      makeCol('id', pkType, true),
      makeCol('first_name', shortText),
      makeCol('last_name', shortText),
      makeCol('email', textType, false, false, false, true),
      makeCol('phone', shortText),
      makeCol('created_at', timestampType),
    ];
    const roomCols = [
      makeCol('id', pkType, true),
      makeCol('room_number', shortText, false, false, false, true),
      makeCol('room_type', shortText), // Single, Double, Suite
      makeCol('nightly_rate', decimalType),
      makeCol('max_occupancy', 'int'),
      makeCol('status', shortText), // available, occupied, maintenance
    ];
    const bookingCols = [
      makeCol('id', pkType, true),
      makeCol('guest_id', fkType, false, true, false, false, tblGuests, guestCols[0].id),
      makeCol('room_id', fkType, false, true, false, false, tblRooms, roomCols[0].id),
      makeCol('check_in_date', dateType),
      makeCol('check_out_date', dateType),
      makeCol('total_amount', decimalType),
      makeCol('status', shortText), // confirmed, checked_in, completed, cancelled
      makeCol('created_at', timestampType),
    ];
    const paymentCols = [
      makeCol('id', pkType, true),
      makeCol('booking_id', fkType, false, true, false, false, tblBookings, bookingCols[0].id),
      makeCol('amount', decimalType),
      makeCol('payment_method', shortText), // credit_card, stripe, cash
      makeCol('payment_status', shortText), // paid, pending, refunded
      makeCol('paid_at', timestampType),
    ];

    const newTables: Table[] = [
      makeTable(tblGuests, 'hotel_guests', guestCols, 0, 0, '#3B82F6'),
      makeTable(tblRooms, 'rooms', roomCols, 1, 0, '#10B981'),
      makeTable(tblBookings, 'reservations', bookingCols, 0, 1, '#8B5CF6'),
      makeTable(tblPayments, 'booking_payments', paymentCols, 1, 1, '#F59E0B'),
    ];

    const newRels: Relationship[] = [
      makeRel(tblBookings, bookingCols[1].id, tblGuests, guestCols[0].id, 'fk_booking_guest'),
      makeRel(tblBookings, bookingCols[2].id, tblRooms, roomCols[0].id, 'fk_booking_room'),
      makeRel(tblPayments, paymentCols[1].id, tblBookings, bookingCols[0].id, 'fk_payment_booking'),
    ];

    return {
      explanation: `### 🏨 Hospitality & Reservation System Implemented

Configured a 4-table relational booking engine:
1. **\`hotel_guests\`**: Guest identity & contact details.
2. **\`rooms\`**: Inventory management with types and pricing.
3. **\`reservations\`**: Primary booking junction linking guests and rooms with date boundaries.
4. **\`booking_payments\`**: Financial ledger tracking settlements, methods, and refund statuses.`,
      summary: 'Hotel Booking Schema (4 tables, 3 relationships)',
      updatedSchema: {
        ...currentSchema,
        tables: [...existingTables, ...newTables],
        relationships: [...existingRels, ...newRels],
        updatedAt: Date.now(),
      },
    };
  }

  // 3. RESTAURANT / FOOD DELIVERY
  if (/restaurant|food|delivery|meal|order/i.test(lower) && !/animal/i.test(lower)) {
    const tblRest = `tbl_rest_${Date.now()}`;
    const tblMenu = `tbl_menu_${Date.now() + 1}`;
    const tblCust = `tbl_cust_${Date.now() + 2}`;
    const tblOrd = `tbl_ord_${Date.now() + 3}`;
    const tblItems = `tbl_items_${Date.now() + 4}`;

    const restCols = [
      makeCol('id', pkType, true),
      makeCol('name', shortText),
      makeCol('cuisine_type', shortText),
      makeCol('phone', shortText),
      makeCol('address', textType),
      makeCol('rating', decimalType),
    ];
    const menuCols = [
      makeCol('id', pkType, true),
      makeCol('restaurant_id', fkType, false, true, false, false, tblRest, restCols[0].id),
      makeCol('name', shortText),
      makeCol('description', descType, false, false, true),
      makeCol('price', decimalType),
      makeCol('is_available', 'boolean'),
    ];
    const custCols = [
      makeCol('id', pkType, true),
      makeCol('full_name', shortText),
      makeCol('phone', shortText),
      makeCol('delivery_address', textType),
    ];
    const ordCols = [
      makeCol('id', pkType, true),
      makeCol('customer_id', fkType, false, true, false, false, tblCust, custCols[0].id),
      makeCol('restaurant_id', fkType, false, true, false, false, tblRest, restCols[0].id),
      makeCol('order_status', shortText),
      makeCol('total_price', decimalType),
      makeCol('ordered_at', timestampType),
    ];
    const itemCols = [
      makeCol('id', pkType, true),
      makeCol('order_id', fkType, false, true, false, false, tblOrd, ordCols[0].id),
      makeCol('menu_item_id', fkType, false, true, false, false, tblMenu, menuCols[0].id),
      makeCol('quantity', 'int'),
      makeCol('unit_price', decimalType),
    ];

    const newTables: Table[] = [
      makeTable(tblRest, 'restaurants', restCols, 0, 0, '#EC4899'),
      makeTable(tblMenu, 'menu_items', menuCols, 1, 0, '#F59E0B'),
      makeTable(tblCust, 'customers', custCols, 2, 0, '#3B82F6'),
      makeTable(tblOrd, 'orders', ordCols, 0, 1, '#8B5CF6'),
      makeTable(tblItems, 'order_items', itemCols, 1, 1, '#10B981'),
    ];

    const newRels: Relationship[] = [
      makeRel(tblMenu, menuCols[1].id, tblRest, restCols[0].id, 'fk_menu_restaurant'),
      makeRel(tblOrd, ordCols[1].id, tblCust, custCols[0].id, 'fk_order_customer'),
      makeRel(tblOrd, ordCols[2].id, tblRest, restCols[0].id, 'fk_order_restaurant'),
      makeRel(tblItems, itemCols[1].id, tblOrd, ordCols[0].id, 'fk_item_order'),
      makeRel(tblItems, itemCols[2].id, tblMenu, menuCols[0].id, 'fk_item_menu'),
    ];

    return {
      explanation: `### 🍕 Food Delivery & Restaurant Platform Architecture

Constructed a 5-entity order fulfillment architecture:
1. **\`restaurants\`**: Commercial food vendor records and cuisines.
2. **\`menu_items\`**: Dishes and pricing linked to restaurants (\`1:N\`).
3. **\`customers\`**: End-user profiles and delivery drop-off points.
4. **\`orders\`**: Primary order lifecycle and totals.
5. **\`order_items\`**: Itemized order lines capturing quantity and unit historical prices.`,
      summary: 'Restaurant & Delivery Schema (5 tables, 5 relationships)',
      updatedSchema: {
        ...currentSchema,
        tables: [...existingTables, ...newTables],
        relationships: [...existingRels, ...newRels],
        updatedAt: Date.now(),
      },
    };
  }

  // 4. SCHOOL / EDUCATION / UNIVERSITY
  if (/school|university|student|course|education|grade|teacher/i.test(lower)) {
    const tblStudents = `tbl_students_${Date.now()}`;
    const tblTeachers = `tbl_teachers_${Date.now() + 1}`;
    const tblCourses = `tbl_courses_${Date.now() + 2}`;
    const tblEnroll = `tbl_enroll_${Date.now() + 3}`;

    const studCols = [
      makeCol('id', pkType, true),
      makeCol('first_name', shortText),
      makeCol('last_name', shortText),
      makeCol('email', textType, false, false, false, true),
      makeCol('enrollment_date', dateType),
    ];
    const teachCols = [
      makeCol('id', pkType, true),
      makeCol('full_name', shortText),
      makeCol('department', shortText),
      makeCol('email', textType, false, false, false, true),
    ];
    const courseCols = [
      makeCol('id', pkType, true),
      makeCol('instructor_id', fkType, false, true, false, false, tblTeachers, teachCols[0].id),
      makeCol('course_code', shortText, false, false, false, true),
      makeCol('title', textType),
      makeCol('credits', 'int'),
    ];
    const enrollCols = [
      makeCol('id', pkType, true),
      makeCol('student_id', fkType, false, true, false, false, tblStudents, studCols[0].id),
      makeCol('course_id', fkType, false, true, false, false, tblCourses, courseCols[0].id),
      makeCol('grade', shortText, false, false, true),
      makeCol('enrolled_at', timestampType),
    ];

    const newTables: Table[] = [
      makeTable(tblStudents, 'students', studCols, 0, 0, '#3B82F6'),
      makeTable(tblTeachers, 'instructors', teachCols, 1, 0, '#10B981'),
      makeTable(tblCourses, 'courses', courseCols, 0, 1, '#8B5CF6'),
      makeTable(tblEnroll, 'course_enrollments', enrollCols, 1, 1, '#EC4899'),
    ];

    const newRels: Relationship[] = [
      makeRel(tblCourses, courseCols[1].id, tblTeachers, teachCols[0].id, 'fk_course_instructor'),
      makeRel(tblEnroll, enrollCols[1].id, tblStudents, studCols[0].id, 'fk_enroll_student'),
      makeRel(tblEnroll, enrollCols[2].id, tblCourses, courseCols[0].id, 'fk_enroll_course'),
    ];

    return {
      explanation: `### 🎓 Academic & Student Information System (SIS)

Engineered an educational schema with:
1. **\`students\`**: Student profiles and admission cohorts.
2. **\`instructors\`**: Academic faculty and department classifications.
3. **\`courses\`**: Curricular catalog managed by instructors.
4. **\`course_enrollments\`**: Junction entity tracking course attendance, grades, and completion.`,
      summary: 'Academic SIS Schema (4 tables, 3 relationships)',
      updatedSchema: {
        ...currentSchema,
        tables: [...existingTables, ...newTables],
        relationships: [...existingRels, ...newRels],
        updatedAt: Date.now(),
      },
    };
  }

  // 5. AUDIT LOG EXTENSION
  if (/audit/i.test(lower)) {
    const auditId = `tbl_audit_${Date.now()}`;
    const auditCols = [
      makeCol('id', pkType, true),
      makeCol('table_name', shortText),
      makeCol('action_type', shortText), // INSERT, UPDATE, DELETE
      makeCol('record_id', shortText),
      makeCol('changed_by', textType, false, false, true),
      makeCol('payload_diff', descType, false, false, true),
      makeCol('timestamp', timestampType),
    ];
    const newTables = [makeTable(auditId, 'audit_logs', auditCols, 0, 1.5, '#F59E0B')];

    return {
      explanation: '### 🛡️ System Audit Logging Architecture\n\nAdded an enterprise `audit_logs` entity to capture schema activity, record modifications, user provenance, and JSON payload diffs.',
      summary: 'Added audit_logs entity',
      updatedSchema: {
        ...currentSchema,
        tables: [...existingTables, ...newTables],
        relationships: existingRels,
        updatedAt: Date.now(),
      },
    };
  }

  // 6. ADDRESS / POSTAL EXTENSION
  if (/address/i.test(lower)) {
    const parentTbl = existingTables.find(t => /user|customer|client|patient|member/i.test(t.name)) || existingTables[0];
    const addrId = `tbl_addresses_${Date.now()}`;
    const addrCols = [
      makeCol('id', pkType, true),
      ...(parentTbl ? [makeCol(`${parentTbl.name.replace(/s$/, '')}_id`, fkType, false, true, false, false, parentTbl.id, parentTbl.columns[0]?.id)] : []),
      makeCol('street_line1', textType),
      makeCol('street_line2', textType, false, false, true),
      makeCol('city', shortText),
      makeCol('state_province', shortText),
      makeCol('postal_code', shortText),
      makeCol('country_code', shortText),
      makeCol('is_primary', 'boolean'),
    ];
    const newTables = [makeTable(addrId, 'addresses', addrCols, 1.2, 0.5, '#06B6D4')];
    const newRels = [...existingRels];
    if (parentTbl && parentTbl.columns[0]) {
      newRels.push(makeRel(addrId, addrCols[1].id, parentTbl.id, parentTbl.columns[0].id, `fk_address_${parentTbl.name}`));
    }

    return {
      explanation: `### 📍 Structured Address Architecture\n\nAdded normalized \`addresses\` table with ISO postal fields, linked via foreign key to \`${parentTbl?.name || 'entity'}\`.`,
      summary: 'Added addresses table with foreign key',
      updatedSchema: {
        ...currentSchema,
        tables: [...existingTables, ...newTables],
        relationships: newRels,
        updatedAt: Date.now(),
      },
    };
  }

  // 7. GENERAL DYNAMIC SYSTEM ARCHITECT (FALLBACK FOR ANY USER TOPIC)
  // Extracts topic name or key terms
  const topicMatch = prompt.match(/(?:for|of|about|system|design|schema)\s+(?:a|an|the)?\s*([a-zA-Z0-9_\s]{3,30})/i);
  const domainRaw = topicMatch ? topicMatch[1].trim().replace(/\s+/g, '_') : 'management';
  const cleanDomain = domainRaw.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'core_solution';

  const tblPrimaryId = `tbl_${cleanDomain}_${Date.now()}`;
  const tblDetailId = `tbl_${cleanDomain}_details_${Date.now() + 1}`;
  const tblEventsId = `tbl_${cleanDomain}_events_${Date.now() + 2}`;

  const primaryCols = [
    makeCol('id', pkType, true),
    makeCol('title', textType),
    makeCol('category', shortText),
    makeCol('status', shortText),
    makeCol('priority_level', 'int'),
    makeCol('created_at', timestampType),
  ];

  const detailCols = [
    makeCol('id', pkType, true),
    makeCol(`${cleanDomain}_id`, fkType, false, true, false, false, tblPrimaryId, primaryCols[0].id),
    makeCol('property_key', shortText),
    makeCol('property_value', textType),
    makeCol('notes', descType, false, false, true),
    makeCol('updated_at', timestampType),
  ];

  const eventCols = [
    makeCol('id', pkType, true),
    makeCol(`${cleanDomain}_id`, fkType, false, true, false, false, tblPrimaryId, primaryCols[0].id),
    makeCol('event_type', shortText),
    makeCol('event_timestamp', timestampType),
    makeCol('description', textType),
  ];

  const newTables: Table[] = [
    makeTable(tblPrimaryId, `${cleanDomain}_records`, primaryCols, 0, 0, '#8B5CF6'),
    makeTable(tblDetailId, `${cleanDomain}_metadata`, detailCols, 1, 0, '#06B6D4'),
    makeTable(tblEventsId, `${cleanDomain}_activity`, eventCols, 0, 1, '#10B981'),
  ];

  const newRels: Relationship[] = [
    makeRel(tblDetailId, detailCols[1].id, tblPrimaryId, primaryCols[0].id, `fk_detail_${cleanDomain}`),
    makeRel(tblEventsId, eventCols[1].id, tblPrimaryId, primaryCols[0].id, `fk_event_${cleanDomain}`),
  ];

  return {
    explanation: `### 📐 Relational Architecture for "${prompt}"

I have designed a normalized 3-tier entity model:
1. **\`${cleanDomain}_records\`**: Primary core entity managing life-cycle status, categorization, and tracking.
2. **\`${cleanDomain}_metadata\`**: Linked attribute registry (\`1:N\`) providing flexible schema extension without sparse columns.
3. **\`${cleanDomain}_activity\`**: Historical audit log capturing all temporal events related to the parent record.`,
    summary: `Designed ${cleanDomain} architecture (3 tables, 2 relationships)`,
    updatedSchema: {
      ...currentSchema,
      tables: [...existingTables, ...newTables],
      relationships: [...existingRels, ...newRels],
      updatedAt: Date.now(),
    },
  };
}
