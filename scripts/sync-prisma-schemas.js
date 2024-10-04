const fs = require('fs');
const path = require('path');

const sourceSchemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const cloudFunctionsPath = path.join(__dirname, '..', 'cloud-functions');

function syncSchema(sourcePath, destinationPath) {
  const sourceSchema = fs.readFileSync(sourcePath, 'utf8');
  const destinationSchema = fs.readFileSync(destinationPath, 'utf8');

  const sourceGenerator = sourceSchema.match(/generator[\s\S]*?\}/)[0];
  const destinationGenerator = destinationSchema.match(/generator[\s\S]*?\}/)[0];

  const updatedSchema = sourceSchema.replace(sourceGenerator, destinationGenerator);

  fs.writeFileSync(destinationPath, updatedSchema);
  console.log(`Updated schema at: ${destinationPath}`);
}

// Sync schema for setUpAnalysis
syncSchema(
  sourceSchemaPath,
  path.join(cloudFunctionsPath, 'setUpAnalysis', 'prisma', 'schema.prisma')
);

// Sync schema for questionThemeAnalysisForBatch
syncSchema(
  sourceSchemaPath,
  path.join(cloudFunctionsPath, 'questionThemeAnalysisForBatch', 'prisma', 'schema.prisma')
);