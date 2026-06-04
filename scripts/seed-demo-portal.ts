import { PrismaClient } from "@prisma/client";
import { publishProposal } from "../lib/publish";

const prisma = new PrismaClient();

async function main() {
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: "Dev Admin",
        email: "dev@prismjet.local",
        role: "admin",
      },
    });
  }

  const prospect = await prisma.prospect.create({
    data: {
      prospectName: "Demo Owner",
      companyName: "Demo Aviation LLC",
      contactName: "Alex Demo",
      contactEmail: "alex@demo.local",
      prospectType: "individual_owner",
      opportunityType: "aircraft_management",
      createdById: user.id,
    },
  });

  const aircraft = await prisma.aircraftInstance.create({
    data: { prospectId: prospect.id },
  });

  const proposal = await prisma.proposal.create({
    data: {
      prospectId: prospect.id,
      aircraftInstanceId: aircraft.id,
      proposalName: "Demo Challenger 350 Proposal",
      preparedById: user.id,
      preparedDate: new Date(),
      clientSummary: "Local development demo proposal for Atlas client portal.",
    },
  });

  const { slug, pin } = await publishProposal(proposal.id, user.id);
  console.log(JSON.stringify({ slug, pin, portalUrl: `http://localhost:3000/${slug}` }));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
