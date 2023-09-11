const authMiddleware = require("../middleware/is-auth");
const expect = require("chai").expect;

it("should throw an error if no authorization header is present", () => {
    const req = {
        get: (headerName) => {
            return null;
        },
    };
    expect(authMiddleware.bind(this, req, {}, () => {})).to.throw(
        "Not authenticated."
    );
});
