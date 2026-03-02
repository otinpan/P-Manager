use serde::{Deserialize, Serialize};

// extension/src/types.ts の `Profile` と同じ形。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Profile {
    pub name: String,
    pub age: String,
    #[serde(default)]
    pub self_introduction: Option<String>,
    #[serde(default)]
    pub height: Option<String>,
    #[serde(default)]
    pub figure: Option<String>,
    #[serde(default)]
    pub blood_type: Option<String>,
    #[serde(default)]
    pub brother: Option<String>,
    #[serde(default)]
    pub residence: Option<String>,
    #[serde(default)]
    pub hometown: Option<String>,
    #[serde(default)]
    pub job_category: Option<String>,
    #[serde(default)]
    pub educational_background: Option<String>,
    #[serde(default)]
    pub annual_incom: Option<String>,
    #[serde(default)]
    pub smoking: Option<String>,
    #[serde(default)]
    pub school_name: Option<String>,
    #[serde(default)]
    pub job_name: Option<String>,
    #[serde(default)]
    pub marital_status: Option<String>,
    #[serde(default)]
    pub has_kids: Option<String>,
    #[serde(default)]
    pub marriage_intention: Option<String>,
    #[serde(default)]
    pub kids_intention: Option<String>,
    #[serde(default)]
    pub housework_and_childcare: Option<String>,
    #[serde(default)]
    pub preferred_pace: Option<String>,
    #[serde(default)]
    pub cost_of_date: Option<String>,
    #[serde(default)]
    pub character: Option<String>,
    #[serde(default)]
    pub sociality: Option<String>,
    #[serde(default)]
    pub roommate: Option<String>,
    #[serde(default)]
    pub holiday: Option<String>,
    #[serde(default)]
    pub alchole: Option<String>,
    #[serde(default)]
    pub hobbies: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct PartnerRow {
    pub id: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct MessageRow {
    pub id: String,
    pub partner_id: String,
    pub sent_at: String,
    pub is_mine: bool,
    pub body: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct PartnerProfileRow {
    pub partner_id: String,
    #[serde(flatten)]
    pub profile: Profile,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct MyProfileRow {
    pub id: String,
    pub updated_at: String,
    #[serde(flatten)]
    pub profile: Profile,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type", deny_unknown_fields)]
pub enum RequestFromChrome {
    #[serde(rename = "MATCH_MESSAGES")]
    MatchMessages {
        partner: PartnerRow,
        user_prompt: String,
        messages: Vec<MessageRow>,
    },
    #[serde(rename = "MATCH_PROFILE")]
    MatchProfile {
        partner: PartnerRow,
        partner_profile: Option<PartnerProfileRow>,
    },
    #[serde(rename = "MY_PROFILE")]
    MyProfile {
        my_profile: Option<MyProfileRow>,
    },
}
