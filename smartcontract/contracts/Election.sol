// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract Election {
    // Admin address
    address public admin;
    // Total number of candidates
    uint256 public candidateCount;
    // Total number of voters
    uint256 public voterCount;
    // Flags to indicate the election's state
    bool public start;
    bool public end;

    // Events
    event ElectionStarted();
    event ElectionEnded();
    event CandidateAdded(uint256 candidateId, string header);
    event VoteCast(address voter, uint256 candidateId);
    event AdminTransferred(address indexed oldAdmin, address indexed newAdmin);
    event VoterRemoved(address indexed voterAddress);

    // Struct to represent a voter
    struct Voter {
        address voterAddress; // Address of the voter
        string name; // Name of the voter
        string phone; // Phone number of the voter
        uint weight; // Weight of the vote (for delegation)
        bool voted; // Whether the voter has voted
        address delegate; // Address to whom the vote is delegated
        uint vote; // Index of the candidate voted for
        bool isVerified; // Whether the voter is verified
        bool isRegistered; // Whether the voter is registered
    }

    // Struct to represent a candidate
    struct Candidate {
        uint256 candidateId; // Unique ID of the candidate
        string header; // Name or title of the candidate
        string slogan; // Slogan or description of the candidate
        uint256 voteCount; // Number of votes received by the candidate
    }

    // Struct to hold election metadata
    struct ElectionDetails {
        string adminName; // Name of the admin
        string adminEmail; // Email of the admin
        string adminTitle; // Title of the admin
        string electionTitle; // Title of the election
        string organizationTitle; // Organization managing the election
    }

    // Election details instance
    ElectionDetails public electionDetails;
    // Mapping of voter address to Voter struct
    mapping(address => Voter) public voterDetails;
    // Mapping of candidate ID to Candidate struct
    mapping(uint256 => Candidate) public candidateDetails;
    // Array of voter addresses
    address[] public voters;

    // Modifier to restrict access to admin only
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    // Constructor to initialize the contract with election details
    constructor(string memory _adminName, string memory _adminEmail, string memory _adminTitle, string memory _electionTitle, string memory _organizationTitle) {
      require(bytes(_adminName).length > 0, "Admin Name is required");
      require(bytes(_adminEmail).length > 0, "Admin Email is required");
      require(bytes(_adminTitle).length > 0, "Admin Title is required");
      require(bytes(_electionTitle).length > 0, "Election Title is required");
      require(bytes(_organizationTitle).length > 0, "Organization Title is required");

      admin = msg.sender;
      candidateCount = 0;
      voterCount = 0;
      start = false;
      end = false;
      electionDetails = ElectionDetails(_adminName, _adminEmail, _adminTitle, _electionTitle, _organizationTitle);
    }


    // Admin functions
    function transferAdmin(address newAdmin) public onlyAdmin {
        require(newAdmin != address(0), "Invalid address");
        emit AdminTransferred(admin, newAdmin);
        admin = newAdmin;
    }

    // Function to add a candidate to the election
    function addCandidate(string memory _header, string memory _slogan) public onlyAdmin {
        candidateDetails[candidateCount] = Candidate({
            candidateId: candidateCount,
            header: _header,
            slogan: _slogan,
            voteCount: 0
        });
        emit CandidateAdded(candidateCount, _header);
        candidateCount++;
    }

    // Function to get the total number of candidates
    function getTotalCandidates() public view returns (uint256) {
        return candidateCount;
    }

    // Function for a user to register as a voter
    function registerAsVoter(string memory _name, string memory _phone) public {
        require(!voterDetails[msg.sender].isRegistered, "Already registered");
        voterDetails[msg.sender] = Voter({
            voterAddress: msg.sender,
            name: _name,
            phone: _phone,
            weight: 1,
            voted: false,
            delegate: address(0),
            vote: 0,
            isVerified: false,
            isRegistered: true
        });
        voters.push(msg.sender);
        voterCount++;
    }


    // Function to get voter details
    function getVoterList() public view onlyAdmin returns (address[] memory, string[] memory, string[] memory, bool[] memory) {
        address[] memory voterAddresses = new address[](voterCount);
        string[] memory voterNames = new string[](voterCount);
        string[] memory voterPhones = new string[](voterCount);
        bool[] memory isVerifiedStatuses = new bool[](voterCount);

        for (uint i = 0; i < voters.length; i++) {
            Voter storage voter = voterDetails[voters[i]];
            voterAddresses[i] = voter.voterAddress;
            voterNames[i] = voter.name;
            voterPhones[i] = voter.phone;
            isVerifiedStatuses[i] = voter.isVerified;
        }

        return (voterAddresses, voterNames, voterPhones, isVerifiedStatuses);
    }


    // Function to verify a voter by the admin
    function verifyVoter(address voterAddress, bool _verifiedStatus) public onlyAdmin {
        require(voterDetails[voterAddress].isRegistered, "Voter not registered");
        voterDetails[voterAddress].isVerified = _verifiedStatus;
    }

    // Function to delegate a vote to another voter
    function delegate(address to) public {
        Voter storage sender = voterDetails[msg.sender];
        require(sender.weight > 0, "No right to vote");
        require(!sender.voted, "Already voted");
        require(to != msg.sender, "Self-delegation is disallowed");

        while (voterDetails[to].delegate != address(0)) {
            to = voterDetails[to].delegate;
            require(to != msg.sender, "Found loop in delegation");
        }

        Voter storage delegate_ = voterDetails[to];
        require(delegate_.isVerified, "Delegate not verified");

        sender.voted = true;
        sender.delegate = to;

        if (delegate_.voted) {
            candidateDetails[delegate_.vote].voteCount += sender.weight;
        } else {
            delegate_.weight += sender.weight;
        }
    }

    function removeVoter(address voterAddress) public onlyAdmin {
        require(voterDetails[voterAddress].isRegistered, "Voter not registered");
        delete voterDetails[voterAddress];
        for (uint i = 0; i < voters.length; i++) {
            if (voters[i] == voterAddress) {
                voters[i] = voters[voters.length - 1];
                voters.pop();
                break;
            }
        }
        voterCount--;
        emit VoterRemoved(voterAddress);
    }

    // Function for a voter to cast a vote
    function vote(uint256 candidateId) public {
        Voter storage sender = voterDetails[msg.sender];
        require(sender.weight > 0, "No right to vote");
        require(!sender.voted, "Already voted");
        require(sender.isVerified, "Not verified to vote");
        require(start, "Election not started");
        require(!end, "Election has ended");
        require(candidateId < candidateCount, "Invalid candidate ID");

        sender.voted = true;
        sender.vote = candidateId;
        candidateDetails[candidateId].voteCount += sender.weight;

        emit VoteCast(msg.sender, candidateId);
    }

    // Function to end the election
    function endElection() public onlyAdmin {
        require(start, "Election not started");
        end = true;
        start = false;
        emit ElectionEnded();
    }

    // Function to start the election
    function startElection() public onlyAdmin {
        require(!start, "Election already started");
        start = true;
        end = false;
        emit ElectionStarted();
    }

    // Function to get the election details
    function getElectionDetails() public view returns (string memory, string memory, string memory, string memory, string memory) {
        return (
            electionDetails.adminName,
            electionDetails.adminEmail,
            electionDetails.adminTitle,
            electionDetails.electionTitle,
            electionDetails.organizationTitle
        );
    }

    // Function to compute and return the winner of the election
    function getWinner() public view returns (uint256 winnerId, string memory header, string memory slogan) {
        require(end, "Election not ended");
        uint256 maxVotes = 0;
        uint256 winningCandidateId;
        bool tie = false;

        for (uint256 i = 0; i < candidateCount; i++) {
            if (candidateDetails[i].voteCount > maxVotes) {
                maxVotes = candidateDetails[i].voteCount;
                winningCandidateId = i;
                tie = false;
            } else if (candidateDetails[i].voteCount == maxVotes) {
                tie = true;
            }
        }

        require(!tie, "Tie detected, no clear winner");

        Candidate memory winner = candidateDetails[winningCandidateId];
        return (winner.candidateId, winner.header, winner.slogan);
    }
}
