import { User, SkillOffered, SkillNeeded, Bookings } from '../models/index.js';
import { signToken } from '../utils/auth.js';
import { AuthenticationError } from 'apollo-server-errors';

const resolvers = {
  Query: {
    me: async (_parent, _args, context) => {
      if (context.user) {
        return await User.findById(context.user._id)
          .populate('skillsOffered')
          .populate('skillsNeeded');
      }
      throw new AuthenticationError('You must be logged in');
    },
    skillsOffered: async () => {
      return await SkillOffered.find().populate('userId');
    },
    skillsNeeded: async () => {
      const skilldata= await  SkillNeeded.find().populate('userId');
      console.log (skilldata)
      return skilldata
    },
    bookings: async (parent, args, context) => {
      if (context.user) {
        return await Bookings.find({ userId: context.user._id });
      }
      throw new AuthenticationError('You must be logged in');
    },
  },

  Mutation: {
    signup: async (parent, { name, username, phone, email, password }) => {
      try {
        console.log('Signup Variables:', { name, username, phone, email, password }); // Log incoming variables

        const existingUser = await User.findOne({ email });
        if (existingUser) {
          throw new AuthenticationError('User with this email already exists');
        }

        const user = await User.create({ name, username, phone, email, password });
        const token = signToken(user);

        return { token, user };
      } catch (err) {
        console.error('Error in signup mutation:', err); // Log the actual error
        throw new Error('Failed to create user');
      }
    },
    login: async (parent, { email, password }) => {
      const user = await User.findOne({ email });
      if (!user) {
        throw new AuthenticationError('No user found with this email');
      }

      const isPasswordCorrect = await user.isCorrectPassword(password);
      if (!isPasswordCorrect) {
        throw new AuthenticationError('Incorrect password');
      }

      const token = signToken(user);
      return { token, user };
    },
    addSkillOffered: async (parent, args, context) => {
      if (!context.user) {
        throw new AuthenticationError('You must be logged in');
      }

      const skill = await SkillOffered.create({ ...args, userId: context.user._id });
      await User.findByIdAndUpdate(context.user._id, { $push: { skillsOffered: skill._id } });
      return skill;
    },
    addSkillNeeded: async (parent, args, context) => {
      if (context.user) {
        const skill = await SkillNeeded.create({ ...args, userId: context.user._id });
        await User.findByIdAndUpdate(context.user._id, { $push: { skillsNeeded: skill._id } });
        return skill;
      }
      throw new AuthenticationError('You must be logged in');
    },
    deleteSkillOffered: async (parent, { skillId }, context) => {
      if (context.user) {
        const skill = await SkillOffered.findByIdAndDelete(skillId);
        await User.findByIdAndUpdate(context.user._id, { $pull: { skillsOffered: skillId } });
        return skill;
      }
      throw new AuthenticationError('You must be logged in');
    },
    deleteSkillNeeded: async (parent, { skillId }, context) => {
      if (context.user) {
        const skill = await SkillNeeded.findByIdAndDelete(skillId);
        await User.findByIdAndUpdate(context.user._id, { $pull: { skillsNeeded: skillId } });
        return skill;
      }
      throw new AuthenticationError('You must be logged in');
    },
    requestSession: async (parent, { skillId, date }, context) => {
      if (context.user) {
        return Bookings.create({ userId: context.user._id, skillId, date });
      }
      throw new AuthenticationError('You must be logged in');
    },
  },
};

export default resolvers;