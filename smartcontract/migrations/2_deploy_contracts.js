var Election = artifacts.require("./Election.sol");

module.exports = function(deployer) {
    deployer.deploy(Election, 
        "Admin",               // Admin Name
        "admin@example.com",   // Admin Email
        "Admin Title",         // Admin Title
        "Parlamentare",        // Election Title
        "AEP"                  // Organization Title
    );
};
