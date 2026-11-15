import fs from 'fs';
import path from 'path';

const SOURCE_MAP_FILE = 'data/source-map.json';
const EXTRACTED_DIR = 'data/extracted';
const MANIFEST_FILE = 'data/section-manifest.json';

const MODULES = [
  {
    module_number: 1,
    title: 'Foundations, HTTP, Middleware & Routing',
    description: '.NET web architecture, HTTP lifecycle, Kestrel, middleware pipeline, and endpoint routing/constraints',
    sections: ['01', '02', '03', '04', '05']
  },
  {
    module_number: 2,
    title: 'Controllers, Model Binding & Validation',
    description: 'Controllers, IActionResult, ActionResult<T>, binding sources, and validation rules',
    sections: ['06', '07']
  },
  {
    module_number: 3,
    title: 'Razor Views, Partial Views, View Components & Tag Helpers',
    description: 'Razor syntax, layout views, partial views, view components, and custom tag helpers',
    sections: ['08', '09', '10', '11', '17']
  },
  {
    module_number: 4,
    title: 'Dependency Injection, Environments & Configuration',
    description: 'IoC containers, service lifetimes, multi-environment setups, appsettings configuration, and options pattern',
    sections: ['12', '13', '14']
  },
  {
    module_number: 5,
    title: 'Testing (xUnit), CRUD Operations & EF Core',
    description: 'xUnit unit testing, Moq test doubles, CRUD operations, Entity Framework Core, and DB migrations',
    sections: ['15', '16', '18', '19']
  },
  {
    module_number: 6,
    title: 'Enterprise Architecture, Filters, Logging & Identity',
    description: 'Action/result filters, Serilog logging, error handling, SOLID principles, Clean Architecture, and ASP.NET Core Identity',
    sections: ['20', '21', '22', '23', '24', '25']
  },
  {
    module_number: 7,
    title: 'RESTful Web APIs, Swagger, Versioning & Angular Integration',
    description: 'RESTful API principles, conventions, content negotiation, OpenAPI/Swagger documentation, API versioning, and Angular integration with CORS',
    sections: ['26', '27', '28']
  },
  {
    module_number: 8,
    title: 'API Security (JWT) & Modern Minimal APIs',
    description: 'JWT authentication & authorization, claims-based security, endpoint filters, and high-performance Minimal APIs',
    sections: ['29', '30']
  }
];

function buildManifest() {
  console.log('--- Phase C: Content Classification and 8-Module Mapping ---');

  const sourceMap = JSON.parse(fs.readFileSync(SOURCE_MAP_FILE, 'utf8'));

  // Section number to module map
  const secToModule = {};
  for (const mod of MODULES) {
    for (const secStr of mod.sections) {
      secToModule[secStr] = mod;
    }
  }

  const sectionsList = [];
  const assignedSections = new Set();

  for (let i = 1; i <= 30; i++) {
    const secStr = String(i).padStart(2, '0');
    const smEntry = sourceMap[secStr];
    if (!smEntry) throw new Error(`Missing source map for section ${secStr}`);

    const extractedSecFile = path.join(EXTRACTED_DIR, `section-${secStr}.json`);
    if (!fs.existsSync(extractedSecFile)) {
      throw new Error(`Extracted JSON file missing: ${extractedSecFile}`);
    }

    const secJson = JSON.parse(fs.readFileSync(extractedSecFile, 'utf8'));
    const mod = secToModule[secStr];
    if (!mod) {
      throw new Error(`Section ${secStr} is not assigned to any module!`);
    }

    assignedSections.add(secStr);

    sectionsList.push({
      section_number: i,
      normalized_section: secStr,
      title: secJson.title || smEntry.primary_source.proposed_title,
      html_filename: `section-${secStr}.html`,
      source_pdf: smEntry.primary_source.filename,
      source_path: smEntry.primary_source.absolute_path,
      page_count: secJson.total_pages,
      page_range: `1–${secJson.total_pages}`,
      module_number: mod.module_number,
      module_title: mod.title,
      has_cheatsheet: !!smEntry.cheatsheet,
      cheatsheet_file: smEntry.cheatsheet ? smEntry.cheatsheet.filename : null,
      cheatsheet_pages: smEntry.cheatsheet ? smEntry.cheatsheet.page_count : 0
    });
  }

  if (sectionsList.length !== 30) {
    throw new Error(`Expected exactly 30 sections in manifest, found ${sectionsList.length}`);
  }

  if (assignedSections.size !== 30) {
    throw new Error(`Expected exactly 30 unique sections in manifest, found ${assignedSections.size}`);
  }

  const manifest = {
    total_sections: 30,
    total_modules: 8,
    generated_at: new Date().toISOString(),
    modules: MODULES.map(m => ({
      module_number: m.module_number,
      title: m.title,
      description: m.description,
      section_count: m.sections.length,
      sections: m.sections
    })),
    sections: sectionsList
  };

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8');

  console.log('Modules breakdown:');
  for (const m of MODULES) {
    console.log(`  Module ${m.module_number}: ${m.title} (${m.sections.length} sections: ${m.sections.join(', ')})`);
  }
  console.log(`✓ Wrote ${MANIFEST_FILE}`);
  console.log('✓ Phase C Gate PASSED.');
}

buildManifest();
