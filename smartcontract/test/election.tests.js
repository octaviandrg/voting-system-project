const Election = artifacts.require("Election");

contract("Election", accounts => {
    const [admin, voter1, voter2, voter3, newAdmin] = accounts;
    let electionInstance;

    const defaultElectionDetails = {
        adminName: "John Doe",
        adminEmail: "john@example.com",
        adminTitle: "Election Administrator",
        electionTitle: "Board Election 2025",
        organizationTitle: "Test Organization"
    };

    beforeEach(async () => {
        electionInstance = await Election.new(
            defaultElectionDetails.adminName,
            defaultElectionDetails.adminEmail,
            defaultElectionDetails.adminTitle,
            defaultElectionDetails.electionTitle,
            defaultElectionDetails.organizationTitle,
            { from: admin }
        );
    });

    describe("Initialization", () => {
        it("should initialize with correct election details", async () => {
            const details = await electionInstance.getElectionDetails();
            assert.equal(details[0], defaultElectionDetails.adminName);
            assert.equal(details[1], defaultElectionDetails.adminEmail);
            assert.equal(details[2], defaultElectionDetails.adminTitle);
            assert.equal(details[3], defaultElectionDetails.electionTitle);
            assert.equal(details[4], defaultElectionDetails.organizationTitle);
        });

        it("should fail to initialize with empty parameters", async () => {
            try {
                await Election.new("", "email", "title", "election", "org");
                assert.fail("Should have thrown an error");
            } catch (error) {
                assert(error.message.includes("Admin Name is required"));
            }
        });
    });

    describe("Admin Management", () => {
        it("should transfer admin rights", async () => {
            await electionInstance.transferAdmin(newAdmin, { from: admin });
            const newAdminAddress = await electionInstance.admin();
            assert.equal(newAdminAddress, newAdmin);
        });

        it("should not allow non-admin to transfer admin rights", async () => {
            try {
                await electionInstance.transferAdmin(newAdmin, { from: voter1 });
                assert.fail("Should have thrown an error");
            } catch (error) {
                assert(error.message.includes("Only admin can perform this action"));
            }
        });
    });

    describe("Candidate Management", () => {
        it("should add a candidate", async () => {
            await electionInstance.addCandidate("Candidate 1", "Slogan 1", { from: admin });
            const count = await electionInstance.candidateCount();
            assert.equal(count, 1);
            
            const candidate = await electionInstance.candidateDetails(0);
            assert.equal(candidate.header, "Candidate 1");
            assert.equal(candidate.slogan, "Slogan 1");
        });

        it("should not allow non-admin to add candidates", async () => {
            try {
                await electionInstance.addCandidate("Candidate 1", "Slogan 1", { from: voter1 });
                assert.fail("Should have thrown an error");
            } catch (error) {
                assert(error.message.includes("Only admin can perform this action"));
            }
        });
    });

    describe("Voter Registration and Verification", () => {
        it("should register a voter", async () => {
            await electionInstance.registerAsVoter("Voter One", "1234567890", { from: voter1 });
            const voter = await electionInstance.voterDetails(voter1);
            assert.equal(voter.name, "Voter One");
            assert.equal(voter.phone, "1234567890");
            assert.equal(voter.isRegistered, true);
            assert.equal(voter.isVerified, false);
        });

        it("should not allow double registration", async () => {
            await electionInstance.registerAsVoter("Voter One", "1234567890", { from: voter1 });
            try {
                await electionInstance.registerAsVoter("Voter One Again", "1234567890", { from: voter1 });
                assert.fail("Should have thrown an error");
            } catch (error) {
                assert(error.message.includes("Already registered"));
            }
        });

        it("should verify a voter", async () => {
            await electionInstance.registerAsVoter("Voter One", "1234567890", { from: voter1 });
            await electionInstance.verifyVoter(voter1, true, { from: admin });
            const voter = await electionInstance.voterDetails(voter1);
            assert.equal(voter.isVerified, true);
        });

        it("should remove a voter", async () => {
            await electionInstance.registerAsVoter("Voter One", "1234567890", { from: voter1 });
            await electionInstance.removeVoter(voter1, { from: admin });
            const voter = await electionInstance.voterDetails(voter1);
            assert.equal(voter.isRegistered, false);
            const voterCount = await electionInstance.voterCount();
            assert.equal(voterCount, 0);
        });
    });

    describe("Voting Process", () => {
        beforeEach(async () => {
            await electionInstance.addCandidate("Candidate 1", "Slogan 1", { from: admin });
            await electionInstance.addCandidate("Candidate 2", "Slogan 2", { from: admin });
            await electionInstance.registerAsVoter("Voter One", "1234567890", { from: voter1 });
            await electionInstance.verifyVoter(voter1, true, { from: admin });
            await electionInstance.startElection({ from: admin });
        });

        it("should allow verified voter to cast vote", async () => {
            await electionInstance.vote(0, { from: voter1 });
            const voter = await electionInstance.voterDetails(voter1);
            assert.equal(voter.voted, true);
            assert.equal(voter.vote.toString(), "0");
        });

        it("should not allow unverified voter to vote", async () => {
            await electionInstance.registerAsVoter("Voter Two", "0987654321", { from: voter2 });
            try {
                await electionInstance.vote(0, { from: voter2 });
                assert.fail("Should have thrown an error");
            } catch (error) {
                assert(error.message.includes("Not verified to vote"));
            }
        });

        it("should not allow double voting", async () => {
            await electionInstance.vote(0, { from: voter1 });
            try {
                await electionInstance.vote(1, { from: voter1 });
                assert.fail("Should have thrown an error");
            } catch (error) {
                assert(error.message.includes("Already voted"));
            }
        });
    });

    describe("Vote Delegation", () => {
        beforeEach(async () => {
            await electionInstance.addCandidate("Candidate 1", "Slogan 1", { from: admin });
            await electionInstance.registerAsVoter("Voter One", "1234567890", { from: voter1 });
            await electionInstance.registerAsVoter("Voter Two", "0987654321", { from: voter2 });
            await electionInstance.verifyVoter(voter1, true, { from: admin });
            await electionInstance.verifyVoter(voter2, true, { from: admin });
        });

        it("should allow vote delegation to verified voter", async () => {
            await electionInstance.delegate(voter2, { from: voter1 });
            const voter = await electionInstance.voterDetails(voter1);
            assert.equal(voter.delegate, voter2);
        });

        it("should not allow delegation to unverified voter", async () => {
            await electionInstance.registerAsVoter("Voter Three", "1122334455", { from: voter3 });
            try {
                await electionInstance.delegate(voter3, { from: voter1 });
                assert.fail("Should have thrown an error");
            } catch (error) {
                assert(error.message.includes("Delegate not verified"));
            }
        });
    });

    describe("Election State Management", () => {
        it("should start election", async () => {
            await electionInstance.startElection({ from: admin });
            const isStarted = await electionInstance.start();
            const isEnded = await electionInstance.end();
            assert.equal(isStarted, true);
            assert.equal(isEnded, false);
        });

        it("should end election", async () => {
            await electionInstance.startElection({ from: admin });
            await electionInstance.endElection({ from: admin });
            const isStarted = await electionInstance.start();
            const isEnded = await electionInstance.end();
            assert.equal(isEnded, true);
            assert.equal(isStarted, false);
        });

        it("should not allow ending election before starting", async () => {
            try {
                await electionInstance.endElection({ from: admin });
                assert.fail("Should have thrown an error");
            } catch (error) {
                assert(error.message.includes("Election not started"));
            }
        });
    });

    describe("Winner Determination", () => {
        beforeEach(async () => {
            await electionInstance.addCandidate("Candidate 1", "Slogan 1", { from: admin });
            await electionInstance.addCandidate("Candidate 2", "Slogan 2", { from: admin });
            await electionInstance.startElection({ from: admin });
        });

        it("should determine winner correctly", async () => {
            await electionInstance.registerAsVoter("Voter One", "1234567890", { from: voter1 });
            await electionInstance.registerAsVoter("Voter Two", "0987654321", { from: voter2 });
            await electionInstance.verifyVoter(voter1, true, { from: admin });
            await electionInstance.verifyVoter(voter2, true, { from: admin });
            
            await electionInstance.vote(0, { from: voter1 });
            await electionInstance.vote(0, { from: voter2 });
            
            await electionInstance.endElection({ from: admin });
            
            const winner = await electionInstance.getWinner();
            assert.equal(winner.winnerId, 0);
            assert.equal(winner.header, "Candidate 1");
            assert.equal(winner.slogan, "Slogan 1");
        });

        it("should not determine winner before election ends", async () => {
            try {
                await electionInstance.getWinner();
                assert.fail("Should have thrown an error");
            } catch (error) {
                assert(error.message.includes("Election not ended"));
            }
        });
    });
});