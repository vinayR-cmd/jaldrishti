export const getWaterStatus = (tds) => {
    if (tds < 150) {
        return { status: "Safe", action: "Drink", color: "green" };
    } else if (tds < 300) {
        return { status: "Risk", action: "Boil Water", color: "orange" };
    } else {
        return { status: "Unsafe", action: "Avoid Drinking", color: "red" };
    }
};
